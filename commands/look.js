var CommandUtil = require('../src/command_util')
  .CommandUtil;
var sprintf = require('sprintf')
  .sprintf;
var l10n_file = __dirname + '/../l10n/commands/look.yml';
var l10n = new require('jall')(require('js-yaml')
  .load(require('fs')
    .readFileSync(
      l10n_file)
    .toString('utf8')), undefined, 'zz');
var wrap = require('wrap-ansi');
var util = require('util');
var Time = require('../src/time').Time;
l10n.throwOnMissingTranslation(false);

exports.command = function(rooms, items, players, npcs, Commands) {

  return function(args, player, hasExplored) {
    var room = rooms.getAt(player.getLocation());
    var locale = player.getLocale();
    var thingIsPlayer = false;


    if (args) {
      args = args.toLowerCase();

      // Look at items in the room first
      var thing = CommandUtil.findItemInRoom(items, args, room, player,
        true);

      if (!thing) {
        // Then the inventory
        thing = CommandUtil.findItemInInventory(args, player, true);
      }

      if (!thing) {
        // then for an NPC
        thing = CommandUtil.findNpcInRoom(npcs, args, room, player, true);
      }

      if (!thing && isLookingAtSelf()) {
        thing = player;
        thingIsPlayer = true;
      }


      function isLookingAtSelf() {
        var me = ['me', 'self', player.getName().toLowerCase()];
        return me.includes(args);
      };

      if (!thing) {
        players.eachIf(
          CommandUtil.otherPlayerInRoom.bind(null, player),
          lookAtOther);
      }

      function lookAtOther(p) {
        if (args === p.getName().toLowerCase()) {
          thing = p;
          player.sayL10n(l10n, 'IN_ROOM', thing.getName());
          thingIsPlayer = true;
          p.sayL10n(l10n, 'BEING_LOOKED_AT', player.getName());
        }
      }

      if (!thing) {
        // then look at exits
        var exits = room.getExits();
        exits.forEach(exit => {
          if (args === exit.direction) {
            thing = rooms.getAt(exit.location);
            player.say(thing.getTitle(locale));
          }
        });
      }

      if (!thing) {
        player.sayL10n(l10n, 'ITEM_NOT_FOUND');
        return;
      }

      player.say(thing.getDescription(locale));
      if (thingIsPlayer) showPlayerEquipment(thing, player);

      return;
    }


    if (!room) {
      player.sayL10n(l10n, 'LIMBO');
      return;
    }

    // Render the room and its exits
    player.say(room.getTitle(locale));

    var descPreference = player.getPreference('roomdescs');

    if (Time.isDay()) {

      var showShortByDefault = (hasExplored === true && !descPreference === 'verbose');

      if (showShortByDefault || descPreference === 'short') {
        player.say(wrap(room.getShortDesc(locale), 80));
      } else {
        player.say(wrap(room.getDescription(locale), 80));
      }

    } else {
      player.say(wrap(room.getDarkDesc(locale), 80));
    }

    player.say('');

    // display players in the same room
    players.eachIf(CommandUtil.otherPlayerInRoom.bind(null, player),
      p => {
        player.sayL10n(l10n, 'IN_ROOM', p.getName());
      });

    // show all the items in the rom
    room.getItems()
      .forEach(id => {
        player.say('<magenta>'
        + items.get(id).getShortDesc(locale)
        + '</magenta>');
      });

    // show all npcs in the room
    room.getNpcs()
      .forEach(id => {
        var npc = npcs.get(id);

        if (npc) {
          var npcLevel = npc.getAttribute('level');
          var playerLevel = player.getAttribute('level');
          var color = 'cyan';

          if ((npcLevel - playerLevel) > 3)
            color = 'red';
          else if ((npcLevel - playerLevel) >= 1)
            color = 'yellow';
          else if (npcLevel === playerLevel)
            color = 'green';

          player.say('<' + color + '>' + npc
            .getShortDesc(player
              .getLocale()) + '</' + color + '>');
        }
      });

    player.write('[');
    player.write('<cyan>Obvious exits: </cyan>');
    room.getExits()
      .forEach(function(exit) {
        player.write(exit.direction + ' ');
      });
    player.say(']');

    function showPlayerEquipment(playerTarget, playerLooking) {
      var naked = true;
      var equipped = playerTarget.getEquipped();
      for (var i in equipped) {
        var item = items.get(equipped[i]);
        naked = false;
        playerLooking.say(sprintf("%-15s %s", "<" + i + ">", item.getShortDesc(
          playerLooking.getLocale())));
      }
      if (naked) playerLooking.sayL10n(l10n, "NAKED");
    }

  }
};

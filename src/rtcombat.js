module.exports.initiate_combat = _initiate_combat;
//TODO: Add strings for sanity damage
//TODO: Implement use of attributes besides damage in combat.
// ^^ this should be done in the npc/player src files
//TODO: Implement use of combat stance, etc. for strategery.
//FIXME: Combat ends when you die but you get double prompted.

var LevelUtil = require('./levels')
  .LevelUtil;
var CommandUtil = require('./command_util')
  .CommandUtil;
var util = require('util');
var statusUtils = require('./status');



function _initiate_combat(l10n, npc, player, room, npcs, players, rooms, callback) {
  var locale = player.getLocale();
  player.setInCombat(npc);
  npc.setInCombat(player.getName());

  player.sayL10n(l10n, 'ATTACK', npc.getShortDesc(locale));

  var p_locations = [
    'legs',
    'fists',
    'torso',
    'hands', 'head'
    ];

  var p = {
    isPlayer: true,
    name: player.getName(),
    speed: player.getAttackSpeed(),
    weapon: player.getEquipped('wield', true),
    locations: p_locations,
    target: 'body',
  };

  var n = {
    name: npc.getShortDesc(locale),
    speed: npc.getAttackSpeed(),
    weapon: npc.getAttack(locale),
    target: npc.getAttribute('target'),
  };

  var player_combat = combatRound.bind(null, player, npc, p, n);
  var npc_combat = combatRound.bind(null, npc, player, n, p);

  p.attackRound = player_combat;
  n.attackRound = npc_combat;

  setTimeout(npc_combat, n.speed);
  setTimeout(player_combat, p.speed);

  function combatRound(attacker, defender, a, d) {

    if (!defender.isInCombat() || !attacker.isInCombat())
      return;


    var defender_health = defender.getAttribute('health');
    var damage = attacker.getDamage();
    var defender_sanity = defender.getAttribute('sanity');
    var sanityDamage = a.isPlayer ? 0 : attacker.getSanityDamage();
    var hitLocation = d.isPlayer ? decideHitLocation(d.locations, a.target) : 'body';


    if (!damage) {

      if (d.weapon && typeof d.weapon == 'Object')
        d.weapon.emit('parry', defender);

      if (a.isPlayer)
        player.sayL10n(l10n, 'PLAYER_MISS', n.name, damage);

      else
        player.sayL10n(l10n, 'NPC_MISS', a.name);

      broadcastExceptPlayer(
        '<bold>' + a.name + ' attacks ' + d.name +
        ' and misses!' + '</bold>');

    } else {

      damage = defender.damage(calcRawDamage(damage, defender_health), hitLocation);
      var damageStr = getDamageString(damage, defender.getAttribute('health'));

      if (a.weapon && typeof a.weapon == 'Object')
        a.weapon.emit('hit', player);

      if (d.isPlayer)
        player.sayL10n(l10n, 'DAMAGE_TAKEN', a.name, damageStr, a.weapon);

      else player.sayL10n(l10n, 'DAMAGE_DONE', d.name, damageStr);

      broadcastExceptPlayer('<bold><red>' + a.name + ' attacks ' + d.name +
        ' and ' + damageStr + ' them!' + '</red></bold>');

    }

    if (sanityDamage) {
      sanityDamage = calcRawDamage(sanityDamage, defender_sanity);
      defender.setAttribute('sanity', Math.max(defender_sanity - sanityDamage, 0));
    }

    if (defender_health <= damage) {
      defender.setAttribute('health', 1);
      defender.setAttribute('sanity', 1);
      return combat_end(a.isPlayer);
    }

    player.combatPrompt({
      target_condition: statusUtils.getHealthText(
        npc.getAttribute('max_health'),
        player, npc)(npc.getAttribute('health')),
      player_condition: statusUtils.getHealthText(
        player.getAttribute('max_health'),
        player, false)(player.getAttribute('health'))
    });

    broadcastToArea("The sounds of a nearby struggle fill the air.");

    setTimeout(a.attackRound, a.speed);
  }

  function decideHitLocation(locations, target) {
    if (CommandUtil.isCoinFlip()) {
      return target;
    } else return CommandUtil.getRandomFromArr(locations);
  }

  function calcRawDamage(damage, attr) {
    var range = damage.max - damage.min;
    with(Math) {
      return min(

        attr,

        damage.min + max(
          0,
          floor(random() * (range))
        )
      );
    }
  }

  function getDamageString(damage, health) {
    var percentage = Math.round((damage / health) * 100);

    var damageStrings = {
      1: 'tickles',
      3: 'scratches',
      8: 'grazes',
      20: 'hits',
      50: 'wounds',
    };

    for (var cutoff in damageStrings) {
      if (percentage <= cutoff) {
        return damageStrings[cutoff];
      }
    }
    return 'crushes';
  }

  function combat_end(success) {

    player.setInCombat(false);
    npc.setInCombat(false);

    if (success) {

      player.emit('regen');
      room.removeNpc(npc.getUuid());
      npcs.destroy(npc);
      player.sayL10n(l10n, 'WIN', npc.getShortDesc(locale));
      broadcastExceptPlayer('<bold>' + npc.getShortDesc(locale) +
        ' dies.</bold>');

      // hand out experience
      var exp = npc.getAttribute('experience') !== false ?
        npc.getAttribute('experience') : LevelUtil.mobExp(npc.getAttribute('level'));

      player.emit('experience', exp);
    } else {

      player.sayL10n(l10n, 'LOSE', npc.getShortDesc(locale));
      player.emit('die');
      broadcastExceptPlayer(player.getName() +
        ' collapses to the ground, life fleeing their body before your eyes.'
      );

      //TODO: consider doing sanity damage to all other players in the room.
      broadcastExceptPlayer('<blue>A horrible feeling gnaws at the pit of your stomach.</blue>');
      npc.setAttribute('health', npc.getAttribute('max_health'));

      broadcastToArea('The horrific scream of a dying ' +
        statusUtils.getGenderNoun(player) +
        ' echo from nearby.'
      );
    }
    player.prompt();
    callback(success);
  }

  //TODO: More candidates for utilification, I suppose.

  function broadcastExceptPlayer(msg) {
    players.eachExcept(player, function(p) {
      if (p.getLocation() === player.getLocation()) {
        p.say(msg);
        p.prompt();
      }
    });
  }

  function broadcastToArea(msg) {
    players.eachExcept(player, function(p) {
      if (rooms.getAt(p.getLocation())
        .getArea() === rooms.getAt(player.getLocation())
        .getArea()) {
        p.say(msg);
        p.prompt();
      }
    });
  }
}

'use strict';
const EventEmitter = require('events');

/**
 * @property {Area}          area         Area room is in
 * @property {Array<number>} defaultItems Default list of item ids that should load in this room
 * @property {Array<number>} defaultNpcs  Default list of npc ids that should load in this room
 * @property {string}        description  Room description seen on 'look'
 * @property {Array<object>} exits        Exits out of this room { id: number, direction: string, leaveMessage: string }
 * @property {number}        id           Area-relative id (vnum)
 * @property {Set}           items        Items currently in the room
 * @property {Set}           npcs         Npcs currently in the room
 * @property {Set}           players      Players currently in the room
 * @property {string}        script       Name of custom script attached to this room
 * @property {string}        title        Title shown on look/scan
 */
class Room extends EventEmitter {
  constructor(area, def) {
    super();
    var required = ['title', 'description', 'id'];
    for (const prop of required) {
      if (!(prop in def)) {
        throw new Error(`ERROR: AREA[${area.name}] Room does not have required property ${prop}`);
      }
    }

    this.area = area;
    this.defaultItems = def.items;
    this.defaultNpcs  = def.npcs;
    this.description = def.description;
    this.exits = def.exits;
    this.id = def.id;
    this.script = def.script;
    this.title = def.title;

    this.items = new Set();
    this.npcs = new Set();
    this.players = new Set();
  }

  addPlayer(player) {
    this.players.add(player);
  }

  removePlayer(player) {
    this.players.delete(player);
  }

  addNpc(npc) {
    this.npcs.add(npc);
  }

  removeNpc(npc) {
    this.npcs.delete(npc);
  }

  addItem(item) {
    this.items.add(item);
  }

  removeItem(item) {
    this.items.delete(item);
  }

  static getKey(room) {
    return room.area.name + ':' + room.id;
  }
}

module.exports = Room;

'use strict';

const Player  = require('./player').Player;
const Npc     = require('./npcs').Npc;
const Item    = require('./items').Item;
const Account = require('./accounts').Account;

//FIXME: OH NO CIRCULAR DEPENDENCY
const isPlayer  = is(Player);
const isNpc     = is(Npc);
const isItem    = is(Item);
const isAccount = is(Account);

exports.Type = {
  isPlayer, isNpc,
  isItem,   isAccount,
};

/**
 * Takes a constructor and a thing and returns function
 * which then returns a boolean (partial application station)
 * @param typeClass constructor functions
 * @param thing     object
 * @return boolean True is thing is of typeClass
 */

function is(typeClass) {
  console.log(typeClass);
  return thing => thing ?
    thing instanceof typeClass :
    false;
}

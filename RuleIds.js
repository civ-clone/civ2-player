"use strict";
// The ids of this package's rules that another package is expected to name, as a rule set that supersedes one does.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIVIL_WAR_RULE = exports.REBEL_CITIES_RULE = exports.CIVIL_WAR_WEAKER_RULE = exports.CIVIL_WAR_CITIES_RULE = exports.CIVIL_WAR_CAPITAL_RULE = exports.CIVIL_WAR_COMPUTER_RULE = void 0;
/** A civil war needs the loser to be a computer player (not the barbarians): a person's civilization never splits. */
exports.CIVIL_WAR_COMPUTER_RULE = 'civ2-player:city/captured/civil-war/computer';
/** A civil war needs the city taken to be the loser's capital (its Palace). */
exports.CIVIL_WAR_CAPITAL_RULE = 'civ2-player:city/captured/civil-war/capital';
/** A civil war needs the loser to have had more than 4 cities, the one taken included. */
exports.CIVIL_WAR_CITIES_RULE = 'civ2-player:city/captured/civil-war/cities';
/** A civil war needs the captor (or, for a computer captor, the weakest person) to rank below the loser. */
exports.CIVIL_WAR_WEAKER_RULE = 'civ2-player:city/captured/civil-war/weaker';
/** The capital's land mass stays loyal; others go whole, or else the farthest cities until they hold a third. */
exports.REBEL_CITIES_RULE = 'civ2-player:civil-war/rebel-cities';
/** Splitting the capital's player when its Palace city is taken and the `CivilWar` rules agree. */
exports.CIVIL_WAR_RULE = 'civ2-player:city/captured/civil-war';
//# sourceMappingURL=RuleIds.js.map
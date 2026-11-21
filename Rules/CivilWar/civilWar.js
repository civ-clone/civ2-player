"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRules = exports.rebelsLastContactTurnsAgo = exports.civilWarPriority = void 0;
const flags_1 = require("@civ-clone/civ2-diplomacy/lib/flags");
const RuleIds_1 = require("../../RuleIds");
const civilWar_1 = require("../../lib/civilWar");
const civilWar_2 = require("@civ-clone/base-civil-war/lib/civilWar");
const Captured_1 = require("@civ-clone/core-city/Rules/Captured");
const CivilWar_1 = require("@civ-clone/base-civil-war/Rules/CivilWar");
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Description_1 = require("@civ-clone/core-rule/Description");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Gold_1 = require("@civ-clone/base-city-yield-gold/Gold");
const Never_1 = require("@civ-clone/core-diplomacy/Expiries/Never");
const CityImprovements_1 = require("@civ-clone/civ2-city-improvement/CityImprovements");
const Priority_1 = require("@civ-clone/core-rule/Priority");
const RebelCities_1 = require("@civ-clone/base-civil-war/Rules/RebelCities");
const Research_1 = require("@civ-clone/core-science/Yields/Research");
const Seceded_1 = require("@civ-clone/base-civil-war/Rules/Seceded");
const War_1 = require("@civ-clone/base-diplomacy-declaration-war/War");
const capital_1 = require("@civ-clone/civ2-city-improvement/lib/capital");
const cancelSpaceship_1 = require("@civ-clone/base-spaceship/lib/cancelSpaceship");
const isBarbarian_1 = require("@civ-clone/base-civilization-barbarian/isBarbarian");
const isHuman_1 = require("@civ-clone/civ2-difficulty/isHuman");
const makeContact_1 = require("@civ-clone/base-diplomacy-interaction-contact/makeContact");
const lastContact_1 = require("@civ-clone/base-diplomacy/lib/lastContact");
/**
 * Where the civil war runs among a capture's rules: first, as `city_capture_aftermath` decides it before the plunder's
 *  share (civ2-city's `High` snapshot reads the loser's halved gold) and before the Palace escape (civ2-city-improvement).
 */
exports.civilWarPriority = 900;
/** `civ_create`'s last-contact turn for the rebels with everyone: 8 turns ago (civ.cpp:7477). */
exports.rebelsLastContactTurnsAgo = 8;
/**
 * Civilization II's civil war (OpenCiv2 `src/auto/city.cpp` `city_capture_aftermath` :5441-5460, `src/auto/civ.cpp`
 *  `civ_civil_war` :7393, richardpenman/civ2@49f26ec), on `base-civil-war`. When a computer player with more than 4
 *  cities loses its capital to someone weaker, it splits: the rebels take a free civilization slot, the cities
 *  `RebelCities` picks, half the gold, the government, what it knows and sees, and a war with the loser; each side's
 *  Palace goes to its most central city. With no free slot the loser keeps everything, its Palace can't escape and its
 *  most central city starts building a new one.
 */
const getRules = (game) => {
    const fail = (city, loser) => {
        (0, capital_1.barPalaceEscape)(city);
        // No escape, so the ship is lost (`civ_spaceship_lost_notify`).
        (0, cancelSpaceship_1.default)(loser, game.spaceships);
        const central = (0, civilWar_1.centralCity)(game.cities.getByPlayer(loser));
        if (central === null) {
            return;
        }
        try {
            game.cityBuilds.getByCity(central).build(CityImprovements_1.Palace);
        }
        catch (e) {
            // Nothing to build it with: the rebuilding is left to the computer player's own choices.
        }
    };
    return [
        new CivilWar_1.default(RuleIds_1.CIVIL_WAR_COMPUTER_RULE, new Effect_1.default((city, captor, loser) => !(0, isBarbarian_1.default)(loser) && !(0, isHuman_1.default)(loser, game.clients))),
        new CivilWar_1.default(RuleIds_1.CIVIL_WAR_CAPITAL_RULE, new Effect_1.default((city) => (0, civilWar_1.hasPalace)(game, city))),
        new CivilWar_1.default(RuleIds_1.CIVIL_WAR_CITIES_RULE, 
        // The city taken is still the loser's in the original (`civs[civ2].num_cities`).
        new Effect_1.default((city, captor, loser) => game.cities.getByPlayer(loser).length + 1 > 4)),
        new CivilWar_1.default(RuleIds_1.CIVIL_WAR_WEAKER_RULE, new Effect_1.default((city, captor, loser) => (0, civilWar_1.isWeaker)(game, city, captor, loser))),
        new RebelCities_1.default(RuleIds_1.REBEL_CITIES_RULE, new Effect_1.default((loser, lost) => (0, civilWar_1.rebelCitiesOf)(game, loser, lost))),
        new Captured_1.default(RuleIds_1.CIVIL_WAR_RULE, new Priority_1.default(exports.civilWarPriority), new Criterion_1.default((city, captor, loser) => (0, civilWar_2.breaksOut)(city, captor, loser, game.rules)), new Effect_1.default((city, captor, loser) => {
            // The original needs a free civilization number (`civ_civil_war`, civ.cpp:7430-7437) and gives the loser a new
            //  Palace site without one; here a player can always be added, so it fails only with no civilization left.
            if ((0, civilWar_2.default)(game, loser, city) === null) {
                fail(city, loser);
            }
            // Otherwise the loser's ship is lost unless its Palace escapes after all: civ2-city-improvement's escape rule,
            //  run next with what the war left it, loses it (`city_capture_aftermath_palace_escape` with no `city4`).
        }), 
        // Its conditions (a computer player's capital, more than 4 cities, a weaker captor) are the `CivilWar` rules'.
        new Description_1.default({ type: 'civil_war', subject: CityImprovements_1.Palace })),
        // What the rebels take besides their cities (`civ_civil_war`, civ.cpp:7468-7500): half the gold, rounded down…
        new Seceded_1.default('civ2-player:civil-war/seceded/gold', new Effect_1.default((rebels, loser) => {
            var _a, _b;
            const half = Math.floor((0, civilWar_1.goldOf)(game, loser) / 2), treasury = (player) => game.playerTreasuries
                .getByPlayer(player)
                .find((treasury) => treasury.yield() === Gold_1.default);
            (_a = treasury(loser)) === null || _a === void 0 ? void 0 : _a.subtract(half);
            (_b = treasury(rebels)) === null || _b === void 0 ? void 0 : _b.add(half);
        })),
        // …the government…
        new Seceded_1.default('civ2-player:civil-war/seceded/government', new Effect_1.default((rebels, loser) => {
            const current = game.playerGovernments.getByPlayer(loser).current();
            if (current === null) {
                return;
            }
            game.playerGovernments
                .getByPlayer(rebels)
                .set(new current.constructor());
        })),
        // …the research so far (base-civil-war gives the advances), toward what the loser is researching…
        new Seceded_1.default('civ2-player:civil-war/seceded/research', new Effect_1.default((rebels, loser) => {
            const from = game.playerResearch.getByPlayer(loser), to = game.playerResearch.getByPlayer(rebels), researching = from.researching();
            if (researching === null) {
                return;
            }
            try {
                to.research(researching);
                to.add(new Research_1.default(from.progress().value()));
            }
            catch (e) {
                // Not one the rebels can research: they choose their own.
            }
        })),
        // …every square the loser has seen…
        new Seceded_1.default('civ2-player:civil-war/seceded/map', new Effect_1.default((rebels, loser) => {
            game.playerWorlds.getByPlayer(rebels).register(...game.playerWorlds
                .getByPlayer(loser)
                .entries()
                .map((tile) => tile.tile()));
        })),
        // …and a war: the rebels at war with the loser, and the loser the aggressor (`0x82801` its way, `0x2001` theirs).
        //  Everyone counts as having been in contact with them 8 turns ago.
        new Seceded_1.default('civ2-player:civil-war/seceded/war', new Effect_1.default((rebels, loser) => {
            const registries = {
                interactionRegistry: game.interactions,
                ruleRegistry: game.rules,
                turn: game.turn,
            };
            (0, makeContact_1.default)(game.interactions, rebels, loser, game.rules, game.turn);
            game.interactions.register(new War_1.default(rebels, loser, new Never_1.default(), game.rules));
            (0, flags_1.setFlag)(registries, loser, rebels, flags_1.AGGRESSOR | flags_1.AGGRESSOR_LONG);
            game.players
                .entries()
                .filter((other) => other !== rebels && !(0, isBarbarian_1.default)(other))
                .forEach((other) => (0, lastContact_1.recordContact)(registries, other, rebels, game.turn.value() - exports.rebelsLastContactTurnsAgo));
        })),
        // Each side's Palace in its most central city (`civ_find_central_city`): the captured capital is no longer the
        //  loser's.
        new Seceded_1.default('civ2-player:civil-war/seceded/palaces', new Effect_1.default((rebels, loser) => [rebels, loser].forEach((player) => {
            const central = (0, civilWar_1.centralCity)(game.cities.getByPlayer(player));
            if (central !== null && !(0, civilWar_1.hasPalace)(game, central)) {
                new CityImprovements_1.Palace(central, game.rules);
            }
        }))),
    ];
};
exports.getRules = getRules;
exports.default = exports.getRules;
//# sourceMappingURL=civilWar.js.map
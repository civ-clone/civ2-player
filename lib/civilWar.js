"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPalace = exports.rebelCitiesOf = exports.centralCity = exports.distanceBetween = exports.isWeaker = exports.worstHumanRank = exports.captureRanks = exports.goldOf = void 0;
const Gold_1 = require("@civ-clone/base-city-yield-gold/Gold");
const CityImprovements_1 = require("@civ-clone/civ2-city-improvement/CityImprovements");
const startBalance_1 = require("./startBalance");
const isBarbarian_1 = require("@civ-clone/base-civilization-barbarian/isBarbarian");
const isHuman_1 = require("@civ-clone/civ2-difficulty/isHuman");
const capture_1 = require("@civ-clone/civ2-city/lib/capture");
// Civilization II's civil war (OpenCiv2 `src/auto/city.cpp` `city_capture_aftermath` 0057b5df, :5441-5460, and
//  `src/auto/civ.cpp` `civ_civil_war` :7393, `civ_find_central_city` :7361, richardpenman/civ2@49f26ec), on
//  `base-civil-war`. Civilization II numbers its civilizations 1 to 7 and splits one only into a free number; here
//  there are no numbers, so a civil war can always add the rebels, and a rank is only ever compared with a rank.
/** How much gold `player` has. */
const goldOf = (game, player) => {
    var _a, _b;
    return (_b = (_a = game.playerTreasuries
        .getByPlayer(player)
        .find((treasury) => treasury.yield() === Gold_1.default)) === null || _a === void 0 ? void 0 : _a.value()) !== null && _b !== void 0 ? _b : 0;
};
exports.goldOf = goldOf;
/**
 * Each civilization's power rank as `civ_update_power_ranks` (civ.cpp:3072) works it out, the strongest 7 and down by
 *  one, the earlier player first on a tie, from civ2-city's `power` (3 an advance, 8 a citizen and a 32nd of its gold),
 *  with `city` still counted as `loser`'s, as it is through `city_capture_aftermath`. The barbarians have none (0).
 */
const captureRanks = (game, city, loser) => {
    const sizeOf = (city) => game.cityGrowth.getByCity(city).size(), players = game.players
        .entries()
        .filter((player) => !(0, isBarbarian_1.default)(player));
    [loser].forEach((player) => {
        if (!players.includes(player) && !(0, isBarbarian_1.default)(player)) {
            players.push(player);
        }
    });
    return (0, capture_1.powerRanks)(players.map((player) => {
        let advances = 0;
        try {
            advances = game.playerResearch.getByPlayer(player).complete().length;
        }
        catch (e) {
            advances = 0;
        }
        const citySize = game.cities
            .getByPlayer(player)
            .filter((other) => other !== city)
            .reduce((total, other) => total + sizeOf(other), 0) +
            (player === loser ? sizeOf(city) : 0);
        return [player, (0, capture_1.power)(advances, citySize, (0, exports.goldOf)(game, player))];
    }));
};
exports.captureRanks = captureRanks;
/** The rank of the weakest civilization a person plays (`game.worst_human_rank`): 0 when no one plays. */
const worstHumanRank = (game, ranks) => {
    const humanRanks = [...ranks.entries()]
        .filter(([player]) => (0, isHuman_1.default)(player, game.clients))
        .map(([, rank]) => rank);
    return humanRanks.length === 0 ? 0 : Math.min(...humanRanks);
};
exports.worstHumanRank = worstHumanRank;
/**
 * Whether taking `city` counts as the loser beaten by someone weaker (`city_capture_aftermath`, city.cpp:5441-5450): a
 *  person who took it ranks below the loser; for a computer player (or the barbarians), the weakest person ranks below
 *  the loser, so with no person in the game, any loser. The original reads the rank of the civilization numbered as the
 *  weakest person's rank (`power_rank[worst_human_rank]`); with no civilization numbers here, it is that rank itself.
 */
const isWeaker = (game, city, captor, loser) => {
    var _a, _b;
    const ranks = (0, exports.captureRanks)(game, city, loser), loserRank = (_a = ranks.get(loser)) !== null && _a !== void 0 ? _a : 0;
    if (!(0, isBarbarian_1.default)(captor) && (0, isHuman_1.default)(captor, game.clients)) {
        return ((_b = ranks.get(captor)) !== null && _b !== void 0 ? _b : 0) < loserRank;
    }
    return (0, exports.worstHumanRank)(game, ranks) < loserRank;
};
exports.isWeaker = isWeaker;
/** `map_distance_diag` between two squares on Civilization II's isometric map; the world's own distance on any other. */
const distanceBetween = (from, to) => from.map().topologyId() === 'staggered-iso'
    ? (0, startBalance_1.civ2Distance)(from.x(), from.y(), to.x(), to.y(), from.map().width())
    : Math.round(from.distanceFrom(to));
exports.distanceBetween = distanceBetween;
/**
 * `civ_find_central_city` (civ.cpp:7361): the city with the least total distance to all of `cities`, the first on a
 *  tie; `null` with none.
 */
const centralCity = (cities) => {
    let best = null, bestTotal = 0x7fff;
    cities.forEach((city) => {
        const total = cities.reduce((sum, other) => sum + (0, exports.distanceBetween)(city.tile(), other.tile()), 0);
        if (total < bestTotal) {
            bestTotal = total;
            best = city;
        }
    });
    return best;
};
exports.centralCity = centralCity;
/**
 * The cities that join the rebels (`civ_civil_war`, civ.cpp:7442-7563). `lost` is the capital just taken, counted with
 *  the loser's cities as it still is in the original, and the centre the distances are measured from.
 *  - city sizes are summed by land mass; walking the land masses in order, the capital's is loyal, and each other goes
 *    to the rebels unless the rebels already hold more than the loyal side;
 *  - if the loyal side holds at least as much as the rebels, but less than twice, the rebels take those land masses;
 *  - otherwise the rebels take the cities farthest from the capital (more than 1 away), one at a time, until they hold
 *    a third of the loser's citizens.
 */
const rebelCitiesOf = (game, loser, lost) => {
    var _a;
    const sizeOf = (city) => game.cityGrowth.getByCity(city).size(), cities = game.cities
        .entries()
        .filter((city) => !city.destroyed() && (city === lost || city.player() === loser)), landMassOf = (city) => game.landMasses.getByTile(city.tile()), sizes = new Map(), capital = landMassOf(lost);
    cities.forEach((city) => {
        var _a;
        const landMass = landMassOf(city);
        sizes.set(landMass, ((_a = sizes.get(landMass)) !== null && _a !== void 0 ? _a : 0) + sizeOf(city));
    });
    const order = [
        ...game.landMasses.entries(),
        ...(sizes.has(null) ? [null] : []),
    ].filter((landMass) => { var _a; return ((_a = sizes.get(landMass)) !== null && _a !== void 0 ? _a : 0) !== 0; }), rebelLandMasses = new Set();
    let loyal = (_a = sizes.get(capital)) !== null && _a !== void 0 ? _a : 0, rebel = 0;
    order.forEach((landMass) => {
        const size = sizes.get(landMass);
        if (loyal < rebel || landMass === capital) {
            if (landMass !== capital) {
                loyal += size;
            }
            return;
        }
        rebel += size;
        rebelLandMasses.add(landMass);
    });
    if (loyal < rebel * 2 && rebel <= loyal) {
        return cities.filter((city) => city !== lost && rebelLandMasses.has(landMassOf(city)));
    }
    const total = cities.reduce((sum, city) => sum + sizeOf(city), 0), remaining = cities.filter((city) => city !== lost), chosen = [];
    rebel = 0;
    while (rebel * 3 < total) {
        let farthest = null, maximum = 1;
        remaining.forEach((city) => {
            const distance = (0, exports.distanceBetween)(lost.tile(), city.tile());
            if (maximum < distance) {
                maximum = distance;
                farthest = city;
            }
        });
        if (farthest === null) {
            break;
        }
        rebel += sizeOf(farthest);
        chosen.push(farthest);
        remaining.splice(remaining.indexOf(farthest), 1);
    }
    return chosen;
};
exports.rebelCitiesOf = rebelCitiesOf;
/** Whether `city` has its Palace standing. */
const hasPalace = (game, city) => game.cityImprovements
    .getByCity(city)
    .some((improvement) => improvement instanceof CityImprovements_1.Palace);
exports.hasPalace = hasPalace;
//# sourceMappingURL=civilWar.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.balanceStarts = exports.siteOf = exports.civilizeOf = void 0;
const startBalance_1 = require("./startBalance");
const advanceIndex_1 = require("@civ-clone/civ2-science/lib/advanceIndex");
const pickResearch_1 = require("@civ-clone/civ2-science/lib/pickResearch");
const Civilized_1 = require("@civ-clone/base-leader-trait-militarism/Militarism/Civilized");
const Grassland_1 = require("@civ-clone/base-terrain-grassland/Grassland");
const Militaristic_1 = require("@civ-clone/base-leader-trait-militarism/Militarism/Militaristic");
const River_1 = require("@civ-clone/base-terrain-feature-river/River");
const Settlers_1 = require("@civ-clone/base-unit-settlers/Settlers");
const fatCross_1 = require("@civ-clone/base-city-tiles-fat-cross/lib/fatCross");
const isHuman_1 = require("@civ-clone/base-difficulty/lib/isHuman");
const level_1 = require("@civ-clone/civ2-difficulty/level");
const spawnUnits_1 = require("@civ-clone/base-player/lib/spawnUnits");
const DEITY = 5;
/** The leader's civilize attitude: 1 civilized, −1 militaristic, 0 otherwise. */
const civilizeOf = (player) => {
    var _a, _b;
    const traits = (_b = (_a = player.civilization().leader()) === null || _a === void 0 ? void 0 : _a.traits()) !== null && _b !== void 0 ? _b : [];
    return traits.some((trait) => trait instanceof Civilized_1.default)
        ? 1
        : traits.some((trait) => trait instanceof Militaristic_1.default)
            ? -1
            : 0;
};
exports.civilizeOf = civilizeOf;
/** The start's site: its land mass and what a city there would work. */
const siteOf = (tile, world, terrainFeatureRegistry) => {
    var _a;
    const landMass = (_a = world.landMasses().find((candidate) => candidate.hasTile(tile))) !== null && _a !== void 0 ? _a : null, squares = (0, fatCross_1.default)(tile).entries();
    return {
        tile,
        landMass,
        landMassSquares: landMass === null ? 0 : landMass.tiles().length,
        grassland: squares.filter((square) => square.terrain() instanceof Grassland_1.default)
            .length,
        rivers: squares.filter((square) => terrainFeatureRegistry
            .getByTerrain(square.terrain())
            .some((feature) => feature instanceof River_1.default)).length,
    };
};
exports.siteOf = siteOf;
/**
 * Evens up the starts in `starts` (each player and the square it was seated on, in seating order): an extra Settlers
 * on the start square, then each free advance picked as the game picks research before the first turn
 * (`civ_research_complete` → `civ_pick_research_advance`, with no advances counted as gained yet).
 */
const balanceStarts = (starts, world, { clientRegistry, gameDifficultyRegistry, playerResearchRegistry, ruleRegistry, terrainFeatureRegistry, randomNumberGenerator, }) => {
    const sites = starts.map(([, tile]) => (0, exports.siteOf)(tile, world, terrainFeatureRegistry)), level = (0, level_1.levelOf)(gameDifficultyRegistry), humans = starts.map(([player]) => (0, isHuman_1.default)(player, clientRegistry)), bonuses = (0, startBalance_1.startBonuses)((0, startBalance_1.startScores)(sites, world.width()), humans, level === DEITY), knownByAnyone = (index) => playerResearchRegistry
        .entries()
        .some((playerResearch) => (0, advanceIndex_1.knownIndices)(playerResearch.complete()).has(index));
    starts.forEach(([player, tile], position) => {
        const { settlers, advances } = bonuses[position];
        if (settlers) {
            (0, spawnUnits_1.default)(player, tile, [Settlers_1.default], ruleRegistry);
        }
        const playerResearch = playerResearchRegistry
            .entries()
            .find((research) => research.player() === player);
        if (!playerResearch) {
            return;
        }
        for (let i = 0; i < advances; i++) {
            const known = (0, advanceIndex_1.knownIndices)(playerResearch.complete()), picked = (0, pickResearch_1.pickResearch)({
                candidates: (0, advanceIndex_1.researchCandidates)((index) => known.has(index)),
                human: humans[position],
                numberOfAdvances: 0,
                level,
                value: (0, pickResearch_1.advanceValue)({
                    civilize: (0, exports.civilizeOf)(player),
                    known: (index) => known.has(index),
                    knownByAnyone,
                }),
                randomNumberGenerator,
            });
            if (picked < 0) {
                return;
            }
            playerResearch.addAdvance((0, advanceIndex_1.advanceAt)(picked));
        }
    });
};
exports.balanceStarts = balanceStarts;
exports.default = exports.balanceStarts;
//# sourceMappingURL=balanceStarts.js.map
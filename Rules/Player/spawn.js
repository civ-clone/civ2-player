"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRules = void 0;
const RuleRegistry_1 = require("@civ-clone/core-rule/RuleRegistry");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const startTiles_1 = require("../../lib/startTiles");
const Settlers_1 = require("@civ-clone/base-unit-settlers/Settlers");
const Spawn_1 = require("@civ-clone/core-player/Rules/Spawn");
const spawnUnits_1 = require("@civ-clone/base-player/lib/spawnUnits");
const getRules = (ruleRegistry = RuleRegistry_1.instance, startTiles = startTiles_1.instance) => [
    new Spawn_1.default('civ2-player:player/spawn/settlers', 
    // Civilization II's start units: one Settlers (OpenCiv2 `src/auto/civ.cpp` `civ_create_place_units`, :4527).
    new Effect_1.default((player, tile) => {
        (0, spawnUnits_1.default)(player, tile, [Settlers_1.default], ruleRegistry);
    })),
    new Spawn_1.default('civ2-player:player/spawn/record-start', 
    // For the start balancing (`Rules/World/built`).
    new Effect_1.default((player, tile) => startTiles.add(player, tile))),
];
exports.getRules = getRules;
exports.default = exports.getRules;
//# sourceMappingURL=spawn.js.map
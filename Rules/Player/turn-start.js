"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRules = void 0;
const CityRegistry_1 = require("@civ-clone/core-city/CityRegistry");
const RuleRegistry_1 = require("@civ-clone/core-rule/RuleRegistry");
const UnitRegistry_1 = require("@civ-clone/core-unit/UnitRegistry");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const Food_1 = require("@civ-clone/base-terrain-yield-food/Food");
const High_1 = require("@civ-clone/core-rule/Priorities/High");
const Production_1 = require("@civ-clone/base-terrain-yield-production/Production");
const Trade_1 = require("@civ-clone/base-terrain-yield-trade/Trade");
const TurnStart_1 = require("@civ-clone/core-player/Rules/TurnStart");
const processCityYields_1 = require("@civ-clone/base-player/lib/processCityYields");
const resetUnits_1 = require("@civ-clone/base-player/lib/resetUnits");
const getRules = (ruleRegistry = RuleRegistry_1.instance, cityRegistry = CityRegistry_1.instance, unitRegistry = UnitRegistry_1.instance) => [
    new TurnStart_1.default('civ2-player:player/turn-start/process-city-yields', new High_1.default(), new Effect_1.default((player) => {
        // The base yields, Food, Production and Trade, in that order. Once the city is gone, none of the rest of its
        //  yields are processed: a city that starves away on its food completes nothing on its shields.
        (0, processCityYields_1.default)(player, [Food_1.default, Production_1.default, Trade_1.default], cityRegistry, ruleRegistry);
    })),
    new TurnStart_1.default('civ2-player:player/turn-start/reset-units', new Effect_1.default((player) => (0, resetUnits_1.default)(player, unitRegistry))),
];
exports.getRules = getRules;
exports.default = exports.getRules;
//# sourceMappingURL=turn-start.js.map
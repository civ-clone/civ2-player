"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRules = void 0;
const AttributeRegistry_1 = require("@civ-clone/core-civilization/AttributeRegistry");
const CityNameRegistry_1 = require("@civ-clone/core-civilization/CityNameRegistry");
const CivilizationRegistry_1 = require("@civ-clone/core-civilization/CivilizationRegistry");
const ClientRegistry_1 = require("@civ-clone/core-client/ClientRegistry");
const Engine_1 = require("@civ-clone/core-engine/Engine");
const LeaderRegistry_1 = require("@civ-clone/core-civilization/LeaderRegistry");
const PlayerRegistry_1 = require("@civ-clone/core-player/PlayerRegistry");
const PlayerWorldRegistry_1 = require("@civ-clone/core-player-world/PlayerWorldRegistry");
const RuleRegistry_1 = require("@civ-clone/core-rule/RuleRegistry");
const TraitRegistry_1 = require("@civ-clone/core-civilization/TraitRegistry");
const GameDifficultyRegistry_1 = require("@civ-clone/core-difficulty/GameDifficultyRegistry");
const PlayerResearchRegistry_1 = require("@civ-clone/core-science/PlayerResearchRegistry");
const startTiles_1 = require("../../lib/startTiles");
const TerrainFeatureRegistry_1 = require("@civ-clone/core-terrain-feature/TerrainFeatureRegistry");
const Built_1 = require("@civ-clone/core-world/Rules/Built");
const Effect_1 = require("@civ-clone/core-rule/Effect");
const PlayerWorld_1 = require("@civ-clone/core-player-world/PlayerWorld");
const balanceStarts_1 = require("../../lib/balanceStarts");
const core_random_1 = require("@civ-clone/core-random");
const seatPlayers_1 = require("@civ-clone/base-player/lib/seatPlayers");
const getRules = (civilizationRegistry = CivilizationRegistry_1.instance, clientRegistry = ClientRegistry_1.instance, engine = Engine_1.instance, playerRegistry = PlayerRegistry_1.instance, playerWorldRegistry = PlayerWorldRegistry_1.instance, ruleRegistry = RuleRegistry_1.instance, leaderRegistry = LeaderRegistry_1.instance, attributeRegistry = AttributeRegistry_1.instance, cityNameRegistry = CityNameRegistry_1.instance, traitRegistry = TraitRegistry_1.instance, startTiles = startTiles_1.instance, playerResearchRegistry = PlayerResearchRegistry_1.instance, gameDifficultyRegistry = GameDifficultyRegistry_1.instance, terrainFeatureRegistry = TerrainFeatureRegistry_1.instance, randomNumberGenerator = core_random_1.instance) => [
    new Built_1.default('civ2-player:world/built/register-player-worlds', new Effect_1.default((world) => playerRegistry
        .entries()
        .forEach((player) => playerWorldRegistry.register(new PlayerWorld_1.default(player, world))))),
    new Built_1.default('civ2-player:world/built/choose-start-tiles', new Effect_1.default((world) => {
        engine.emit('world:generate-start-tiles');
        // Each player is seated on the square the world's `PickStartTile` rule picks. Civ1's packages also rank the
        //  start squares and emit them as `world:start-tiles`, which nothing listens to, so that is left out here.
        (0, seatPlayers_1.default)(world, clientRegistry, civilizationRegistry, leaderRegistry, attributeRegistry, cityNameRegistry, traitRegistry, ruleRegistry).then(() => {
            // Civilization II's start balancing (`lib/startBalance`), once everyone is seated and before the first turn.
            (0, balanceStarts_1.default)(startTiles.take(), world, {
                clientRegistry,
                gameDifficultyRegistry,
                playerResearchRegistry,
                ruleRegistry,
                terrainFeatureRegistry,
                randomNumberGenerator,
            });
            engine.emit('game:start');
        });
    })),
    new Built_1.default('civ2-player:world/built/emit', new Effect_1.default((world) => {
        engine.emit('world:built', world);
    })),
];
exports.getRules = getRules;
exports.default = exports.getRules;
//# sourceMappingURL=built.js.map
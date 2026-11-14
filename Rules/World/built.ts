import {
  AttributeRegistry,
  instance as attributeRegistryInstance,
} from '@civ-clone/core-civilization/AttributeRegistry';
import {
  CityNameRegistry,
  instance as cityNameRegistryInstance,
} from '@civ-clone/core-civilization/CityNameRegistry';
import {
  CivilizationRegistry,
  instance as civilizationRegistryInstance,
} from '@civ-clone/core-civilization/CivilizationRegistry';
import {
  ClientRegistry,
  instance as clientRegistryInstance,
} from '@civ-clone/core-client/ClientRegistry';
import {
  Engine,
  instance as engineInstance,
} from '@civ-clone/core-engine/Engine';
import {
  LeaderRegistry,
  instance as leaderRegistryInstance,
} from '@civ-clone/core-civilization/LeaderRegistry';
import {
  PlayerRegistry,
  instance as playerRegistryInstance,
} from '@civ-clone/core-player/PlayerRegistry';
import {
  PlayerWorldRegistry,
  instance as playerWorldRegistryInstance,
} from '@civ-clone/core-player-world/PlayerWorldRegistry';
import {
  RuleRegistry,
  instance as ruleRegistryInstance,
} from '@civ-clone/core-rule/RuleRegistry';
import {
  TraitRegistry,
  instance as traitRegistryInstance,
} from '@civ-clone/core-civilization/TraitRegistry';
import {
  GameDifficultyRegistry,
  instance as gameDifficultyRegistryInstance,
} from '@civ-clone/core-difficulty/GameDifficultyRegistry';
import {
  PlayerResearchRegistry,
  instance as playerResearchRegistryInstance,
} from '@civ-clone/core-science/PlayerResearchRegistry';
import StartTiles, {
  instance as startTilesInstance,
} from '../../lib/startTiles';
import {
  TerrainFeatureRegistry,
  instance as terrainFeatureRegistryInstance,
} from '@civ-clone/core-terrain-feature/TerrainFeatureRegistry';
import Built from '@civ-clone/core-world/Rules/Built';
import Effect from '@civ-clone/core-rule/Effect';
import Player from '@civ-clone/core-player/Player';
import PlayerWorld from '@civ-clone/core-player-world/PlayerWorld';
import World from '@civ-clone/core-world/World';
import balanceStarts from '../../lib/balanceStarts';
import { instance as rngInstance } from '@civ-clone/core-random';
import seatPlayers from '@civ-clone/base-player/lib/seatPlayers';

export const getRules = (
  civilizationRegistry: CivilizationRegistry = civilizationRegistryInstance,
  clientRegistry: ClientRegistry = clientRegistryInstance,
  engine: Engine = engineInstance,
  playerRegistry: PlayerRegistry = playerRegistryInstance,
  playerWorldRegistry: PlayerWorldRegistry = playerWorldRegistryInstance,
  ruleRegistry: RuleRegistry = ruleRegistryInstance,
  leaderRegistry: LeaderRegistry = leaderRegistryInstance,
  attributeRegistry: AttributeRegistry = attributeRegistryInstance,
  cityNameRegistry: CityNameRegistry = cityNameRegistryInstance,
  traitRegistry: TraitRegistry = traitRegistryInstance,
  startTiles: StartTiles = startTilesInstance,
  playerResearchRegistry: PlayerResearchRegistry = playerResearchRegistryInstance,
  gameDifficultyRegistry: GameDifficultyRegistry = gameDifficultyRegistryInstance,
  terrainFeatureRegistry: TerrainFeatureRegistry = terrainFeatureRegistryInstance,
  randomNumberGenerator: () => number = rngInstance
): Built[] => [
  new Built(
    'civ2-player:world/built/register-player-worlds',
    new Effect((world: World): void =>
      playerRegistry
        .entries()
        .forEach((player: Player): void =>
          playerWorldRegistry.register(new PlayerWorld(player, world))
        )
    )
  ),
  new Built(
    'civ2-player:world/built/choose-start-tiles',
    new Effect((world: World): void => {
      engine.emit('world:generate-start-tiles');

      // Each player is seated on the square the world's `PickStartTile` rule picks. Civ1's packages also rank the
      //  start squares and emit them as `world:start-tiles`, which nothing listens to, so that is left out here.
      seatPlayers(
        world,
        clientRegistry,
        civilizationRegistry,
        leaderRegistry,
        attributeRegistry,
        cityNameRegistry,
        traitRegistry,
        ruleRegistry
      ).then((): void => {
        // Civilization II's start balancing (`lib/startBalance`), once everyone is seated and before the first turn.
        //  The game starts whatever happens to it: a balancing that fails is reported, and skipped.
        try {
          balanceStarts(startTiles.take(), world, {
            clientRegistry,
            gameDifficultyRegistry,
            playerResearchRegistry,
            ruleRegistry,
            terrainFeatureRegistry,
            randomNumberGenerator,
          });
        } catch (error) {
          console.error('civ2-player: the start balancing failed.', error);
        }

        engine.emit('game:start');
      });
    })
  ),
  new Built(
    'civ2-player:world/built/emit',
    new Effect((world: World): void => {
      engine.emit('world:built', world);
    })
  ),
];

export default getRules;

import {
  RuleRegistry,
  instance as ruleRegistryInstance,
} from '@civ-clone/core-rule/RuleRegistry';
import Effect from '@civ-clone/core-rule/Effect';
import Player from '@civ-clone/core-player/Player';
import StartTiles, {
  instance as startTilesInstance,
} from '../../lib/startTiles';
import Settlers from '@civ-clone/base-unit-settlers/Settlers';
import Spawn from '@civ-clone/core-player/Rules/Spawn';
import Tile from '@civ-clone/core-world/Tile';
import spawnUnits from '@civ-clone/base-player/lib/spawnUnits';

export const getRules = (
  ruleRegistry: RuleRegistry = ruleRegistryInstance,
  startTiles: StartTiles = startTilesInstance
): Spawn[] => [
  new Spawn(
    'civ2-player:player/spawn/settlers',
    // Civilization II's start units: one Settlers (OpenCiv2 `src/auto/civ.cpp` `civ_create_place_units`, :4527).
    new Effect((player: Player, tile: Tile): void => {
      spawnUnits(player, tile, [Settlers], ruleRegistry);
    })
  ),
  new Spawn(
    'civ2-player:player/spawn/record-start',
    // For the start balancing (`Rules/World/built`).
    new Effect((player: Player, tile: Tile): void =>
      startTiles.add(player, tile)
    )
  ),
];

export default getRules;

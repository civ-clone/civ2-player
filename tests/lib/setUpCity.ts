import {
  PlayerWorldRegistry,
  instance as playerWorldRegistryInstance,
} from '@civ-clone/core-player-world/PlayerWorldRegistry';
import {
  RuleRegistry,
  instance as ruleRegistryInstance,
} from '@civ-clone/core-rule/RuleRegistry';
import {
  WorkedTileRegistry,
  instance as workedTileRegistryInstance,
} from '@civ-clone/core-city/WorkedTileRegistry';
import {
  generateGenerator,
  generateWorld,
} from '@civ-clone/core-world/tests/lib/buildWorld';
import CanBeWorked from '@civ-clone/core-city/Rules/CanBeWorked';
import City from '@civ-clone/core-city/City';
import Effect from '@civ-clone/core-rule/Effect';
import Grassland from '@civ-clone/base-terrain-grassland/Grassland';
import Player from '@civ-clone/core-player/Player';
import PlayerWorld from '@civ-clone/core-player-world/PlayerWorld';
import Priority from '@civ-clone/core-rule/Priority';
import Tile from '@civ-clone/core-world/Tile';
import Tiles from '@civ-clone/core-city/Rules/Tiles';
import Tileset from '@civ-clone/core-world/Tileset';

// A city in the middle of a 5 × 5 world of Grassland, its player seeing the squares around it: what the tests need of
//  a city, built from core packages only.
export const setUpCity = async ({
  ruleRegistry = ruleRegistryInstance,
  player = new Player(ruleRegistry),
  playerWorldRegistry = playerWorldRegistryInstance,
  workedTileRegistry = workedTileRegistryInstance,
}: {
  ruleRegistry?: RuleRegistry;
  player?: Player;
  playerWorldRegistry?: PlayerWorldRegistry;
  workedTileRegistry?: WorkedTileRegistry;
} = {}): Promise<City> => {
  ruleRegistry.register(
    new Tiles(
      new Priority(9000),
      new Effect((city: City): Tileset => city.tile().getSurroundingArea(2))
    ),
    new CanBeWorked(
      new Effect(
        (tile: Tile): boolean => !workedTileRegistry.tileIsWorked(tile)
      )
    )
  );

  const world = await generateWorld(
      generateGenerator(5, 5, Grassland),
      ruleRegistry
    ),
    playerWorld = new PlayerWorld(player, world),
    tile = world.get(2, 2);

  playerWorldRegistry.register(playerWorld);
  Tileset.fromSurrounding(tile).forEach((surrounding: Tile): void =>
    playerWorld.register(surrounding)
  );

  return new City(player, tile, '', ruleRegistry, workedTileRegistry);
};

export default setUpCity;

import {
  CityRegistry,
  instance as cityRegistryInstance,
} from '@civ-clone/core-city/CityRegistry';
import {
  RuleRegistry,
  instance as ruleRegistryInstance,
} from '@civ-clone/core-rule/RuleRegistry';
import {
  UnitRegistry,
  instance as unitRegistryInstance,
} from '@civ-clone/core-unit/UnitRegistry';
import Effect from '@civ-clone/core-rule/Effect';
import Food from '@civ-clone/base-terrain-yield-food/Food';
import High from '@civ-clone/core-rule/Priorities/High';
import Player from '@civ-clone/core-player/Player';
import Production from '@civ-clone/base-terrain-yield-production/Production';
import Trade from '@civ-clone/base-terrain-yield-trade/Trade';
import TurnStart from '@civ-clone/core-player/Rules/TurnStart';
import processCityYields from '@civ-clone/base-player/lib/processCityYields';
import resetUnits from '@civ-clone/base-player/lib/resetUnits';

export const getRules = (
  ruleRegistry: RuleRegistry = ruleRegistryInstance,
  cityRegistry: CityRegistry = cityRegistryInstance,
  unitRegistry: UnitRegistry = unitRegistryInstance
): TurnStart[] => [
  new TurnStart(
    'civ2-player:player/turn-start/process-city-yields',
    new High(),
    new Effect((player: Player): void => {
      // The base yields, Food, Production and Trade, in that order. Once the city is gone, none of the rest of its
      //  yields are processed: a city that starves away on its food completes nothing on its shields.
      processCityYields(
        player,
        [Food, Production, Trade],
        cityRegistry,
        ruleRegistry
      );
    })
  ),

  new TurnStart(
    'civ2-player:player/turn-start/reset-units',
    new Effect((player: Player): void => resetUnits(player, unitRegistry))
  ),
];

export default getRules;

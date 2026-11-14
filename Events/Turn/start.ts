import {
  CurrentPlayerRegistry,
  instance as currentPlayerRegistryInstance,
} from '@civ-clone/core-player/CurrentPlayerRegistry';
import {
  Engine,
  instance as engineInstance,
} from '@civ-clone/core-engine/Engine';
import {
  PlayerRegistry,
  instance as playerRegistryInstance,
} from '@civ-clone/core-player/PlayerRegistry';
import barbariansFirst from '@civ-clone/base-player/lib/turnOrder';
import { startTurn } from '@civ-clone/base-player/lib/turns';

export const getEvents: (
  playerRegistry?: PlayerRegistry,
  currentPlayerRegistry?: CurrentPlayerRegistry,
  engine?: Engine
) => [string, () => any][] = (
  playerRegistry: PlayerRegistry = playerRegistryInstance,
  currentPlayerRegistry: CurrentPlayerRegistry = currentPlayerRegistryInstance,
  engine: Engine = engineInstance
): [string, () => any][] => [
  [
    'turn:start',
    (): void => {
      // The barbarians move first, as Civ2's slot 0 does, then everyone else in the order they joined.
      startTurn(
        barbariansFirst(playerRegistry.entries()),
        currentPlayerRegistry,
        engine
      );
    },
  ],
];

export default getEvents;

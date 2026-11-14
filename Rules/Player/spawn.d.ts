import { RuleRegistry } from '@civ-clone/core-rule/RuleRegistry';
import StartTiles from '../../lib/startTiles';
import Spawn from '@civ-clone/core-player/Rules/Spawn';
export declare const getRules: (
  ruleRegistry?: RuleRegistry,
  startTiles?: StartTiles
) => Spawn[];
export default getRules;

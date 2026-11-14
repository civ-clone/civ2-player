import { StartSite } from './startBalance';
import { ClientRegistry } from '@civ-clone/core-client/ClientRegistry';
import { GameDifficultyRegistry } from '@civ-clone/core-difficulty/GameDifficultyRegistry';
import Player from '@civ-clone/core-player/Player';
import { PlayerResearchRegistry } from '@civ-clone/core-science/PlayerResearchRegistry';
import { RuleRegistry } from '@civ-clone/core-rule/RuleRegistry';
import { TerrainFeatureRegistry } from '@civ-clone/core-terrain-feature/TerrainFeatureRegistry';
import Tile from '@civ-clone/core-world/Tile';
import World from '@civ-clone/core-world/World';
export interface BalanceRegistries {
  clientRegistry: ClientRegistry;
  gameDifficultyRegistry: GameDifficultyRegistry;
  playerResearchRegistry: PlayerResearchRegistry;
  ruleRegistry: RuleRegistry;
  terrainFeatureRegistry: TerrainFeatureRegistry;
  randomNumberGenerator: () => number;
}
/** The leader's civilize attitude: 1 civilized, −1 militaristic, 0 otherwise. */
export declare const civilizeOf: (player: Player) => number;
/** A start square that is on none of the world's land masses: the balancing can't score it. */
export declare class StartNotOnLandError extends Error {}
/** The start's site: its land mass and what a city there would work. */
export declare const siteOf: (
  tile: Tile,
  world: World,
  terrainFeatureRegistry: TerrainFeatureRegistry
) => StartSite;
/**
 * Evens up the starts in `starts` (each player and the square it was seated on, in seating order): an extra Settlers
 * on the start square, then each free advance picked as the game picks research before the first turn
 * (`civ_research_complete` → `civ_pick_research_advance`). Every civilization's `num_advances` is still the 1 it is
 * placed with: advances given before the first turn aren't counted.
 */
export declare const balanceStarts: (
  starts: [Player, Tile][],
  world: World,
  {
    clientRegistry,
    gameDifficultyRegistry,
    playerResearchRegistry,
    ruleRegistry,
    terrainFeatureRegistry,
    randomNumberGenerator,
  }: BalanceRegistries
) => void;
export default balanceStarts;

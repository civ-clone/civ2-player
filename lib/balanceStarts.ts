import { StartSite, startBonuses, startScores } from './startBalance';
import {
  advanceAt,
  knownIndices,
  researchCandidates,
} from '@civ-clone/civ2-science/lib/advanceIndex';
import {
  advanceValue,
  pickResearch,
} from '@civ-clone/civ2-science/lib/pickResearch';
import Civilized from '@civ-clone/base-leader-trait-militarism/Militarism/Civilized';
import { ClientRegistry } from '@civ-clone/core-client/ClientRegistry';
import { GameDifficultyRegistry } from '@civ-clone/core-difficulty/GameDifficultyRegistry';
import Grassland from '@civ-clone/base-terrain-grassland/Grassland';
import Militaristic from '@civ-clone/base-leader-trait-militarism/Militarism/Militaristic';
import Player from '@civ-clone/core-player/Player';
import { PlayerResearchRegistry } from '@civ-clone/core-science/PlayerResearchRegistry';
import River from '@civ-clone/base-terrain-feature-river/River';
import { RuleRegistry } from '@civ-clone/core-rule/RuleRegistry';
import Settlers from '@civ-clone/base-unit-settlers/Settlers';
import { TerrainFeatureRegistry } from '@civ-clone/core-terrain-feature/TerrainFeatureRegistry';
import Tile from '@civ-clone/core-world/Tile';
import World from '@civ-clone/core-world/World';
import fatCross from '@civ-clone/base-city-tiles-fat-cross/lib/fatCross';
import isHuman from '@civ-clone/base-difficulty/lib/isHuman';
import { levelOf } from '@civ-clone/civ2-difficulty/level';
import spawnUnits from '@civ-clone/base-player/lib/spawnUnits';

const DEITY = 5;

export interface BalanceRegistries {
  clientRegistry: ClientRegistry;
  gameDifficultyRegistry: GameDifficultyRegistry;
  playerResearchRegistry: PlayerResearchRegistry;
  ruleRegistry: RuleRegistry;
  terrainFeatureRegistry: TerrainFeatureRegistry;
  randomNumberGenerator: () => number;
}

/** The leader's civilize attitude: 1 civilized, −1 militaristic, 0 otherwise. */
export const civilizeOf = (player: Player): number => {
  const traits = player.civilization().leader()?.traits() ?? [];

  return traits.some((trait) => trait instanceof Civilized)
    ? 1
    : traits.some((trait) => trait instanceof Militaristic)
    ? -1
    : 0;
};

/** The start's site: its land mass and what a city there would work. */
export const siteOf = (
  tile: Tile,
  world: World,
  terrainFeatureRegistry: TerrainFeatureRegistry
): StartSite => {
  const landMass =
      world.landMasses().find((candidate) => candidate.hasTile(tile)) ?? null,
    squares = fatCross(tile).entries();

  return {
    tile,
    landMass,
    landMassSquares: landMass === null ? 0 : landMass.tiles().length,
    grassland: squares.filter((square) => square.terrain() instanceof Grassland)
      .length,
    rivers: squares.filter((square) =>
      terrainFeatureRegistry
        .getByTerrain(square.terrain())
        .some((feature) => feature instanceof River)
    ).length,
  };
};

/**
 * Evens up the starts in `starts` (each player and the square it was seated on, in seating order): an extra Settlers
 * on the start square, then each free advance picked as the game picks research before the first turn
 * (`civ_research_complete` → `civ_pick_research_advance`, with no advances counted as gained yet).
 */
export const balanceStarts = (
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
): void => {
  const sites = starts.map(([, tile]) =>
      siteOf(tile, world, terrainFeatureRegistry)
    ),
    level = levelOf(gameDifficultyRegistry),
    humans = starts.map(([player]) => isHuman(player, clientRegistry)),
    bonuses = startBonuses(
      startScores(sites, world.width()),
      humans,
      level === DEITY
    ),
    knownByAnyone = (index: number): boolean =>
      playerResearchRegistry
        .entries()
        .some((playerResearch) =>
          knownIndices(playerResearch.complete()).has(index)
        );

  starts.forEach(([player, tile], position): void => {
    const { settlers, advances } = bonuses[position];

    if (settlers) {
      spawnUnits(player, tile, [Settlers], ruleRegistry);
    }

    const playerResearch = playerResearchRegistry
      .entries()
      .find((research) => research.player() === player);

    if (!playerResearch) {
      return;
    }

    for (let i = 0; i < advances; i++) {
      const known = knownIndices(playerResearch.complete()),
        picked = pickResearch({
          candidates: researchCandidates((index) => known.has(index)),
          human: humans[position],
          numberOfAdvances: 0,
          level,
          value: advanceValue({
            civilize: civilizeOf(player),
            known: (index) => known.has(index),
            knownByAnyone,
          }),
          randomNumberGenerator,
        });

      if (picked < 0) {
        return;
      }

      playerResearch.addAdvance(advanceAt(picked));
    }
  });
};

export default balanceStarts;

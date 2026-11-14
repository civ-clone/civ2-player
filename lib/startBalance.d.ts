import Tile from '@civ-clone/core-world/Tile';
/**
 * Civilization II's `map_distance_diag` between two squares of a staggered map, as the game stores them: each row's
 * squares are 2 apart, odd rows shifted by 1, so the horizontal difference counts half squares. It wraps east to west
 * (`map_dx_wrapped`) and, from the two differences, `dist_from_deltas` gives the larger less half the excess of half
 * their sum over the smaller, rounded up.
 */
export declare const civ2Distance: (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number
) => number;
/** What the score of a start depends on. */
export interface StartSite {
  tile: Tile;
  /** The land mass the start is on (any value that is equal for starts on the same one). */
  landMass: unknown;
  /** How many land squares that land mass has. */
  landMassSquares: number;
  /** Of the 21 squares a city there would work, how many are Grassland. */
  grassland: number;
  /** Of those squares, how many have a river. */
  rivers: number;
}
/**
 * Each start's score, from the C:
 *
 * - **Room:** with the nearest other start on the same land mass at least 10 away, +1 under 20, +2 from 20, and alone
 *   on its land mass, +3 to +6 by its squares / 50.
 * - **Land:** with 4 or more rivers among the city's squares +4; otherwise +2 with more than 3 Grassland.
 * - **Size:** +0 to +3 by the land mass's squares / 50.
 */
export declare const startScores: (
  sites: StartSite[],
  width: number
) => number[];
/** What a start is given to even it up. */
export interface StartBonus {
  settlers: boolean;
  advances: number;
}
/**
 * What each start gets, from its score and the best: an extra Settlers when more than 3 short (or a person's on Deity),
 * which counts as 3 more points (1 for a person on Deity), and an advance for each point still short.
 */
export declare const startBonuses: (
  scores: number[],
  humans: boolean[],
  deity: boolean
) => StartBonus[];

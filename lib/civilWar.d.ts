import City from '@civ-clone/core-city/City';
import { Game } from '@civ-clone/core-game';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
/** How much gold `player` has. */
export declare const goldOf: (game: Game, player: Player) => number;
/**
 * Each civilization's power rank as `civ_update_power_ranks` (civ.cpp:3072) works it out, the strongest 7 and down by
 *  one, the earlier player first on a tie, from civ2-city's `power` (3 an advance, 8 a citizen and a 32nd of its gold),
 *  with `city` still counted as `loser`'s, as it is through `city_capture_aftermath`. The barbarians have none (0).
 */
export declare const captureRanks: (
  game: Game,
  city: City,
  loser: Player
) => Map<Player, number>;
/** The rank of the weakest civilization a person plays (`game.worst_human_rank`): 0 when no one plays. */
export declare const worstHumanRank: (
  game: Game,
  ranks: Map<Player, number>
) => number;
/**
 * Whether taking `city` counts as the loser beaten by someone weaker (`city_capture_aftermath`, city.cpp:5441-5450): a
 *  person who took it ranks below the loser; for a computer player (or the barbarians), the weakest person ranks below
 *  the loser, so with no person in the game, any loser. The original reads the rank of the civilization numbered as the
 *  weakest person's rank (`power_rank[worst_human_rank]`); with no civilization numbers here, it is that rank itself.
 */
export declare const isWeaker: (
  game: Game,
  city: City,
  captor: Player,
  loser: Player
) => boolean;
/** `map_distance_diag` between two squares on Civilization II's isometric map; the world's own distance on any other. */
export declare const distanceBetween: (from: Tile, to: Tile) => number;
/**
 * `civ_find_central_city` (civ.cpp:7361): the city with the least total distance to all of `cities`, the first on a
 *  tie; `null` with none.
 */
export declare const centralCity: (cities: City[]) => City | null;
/**
 * The cities that join the rebels (`civ_civil_war`, civ.cpp:7442-7563). `lost` is the capital just taken, counted with
 *  the loser's cities as it still is in the original, and the centre the distances are measured from.
 *  - city sizes are summed by land mass; walking the land masses in order, the capital's is loyal, and each other goes
 *    to the rebels unless the rebels already hold more than the loyal side;
 *  - if the loyal side holds at least as much as the rebels, but less than twice, the rebels take those land masses;
 *  - otherwise the rebels take the cities farthest from the capital (more than 1 away), one at a time, until they hold
 *    a third of the loser's citizens.
 */
export declare const rebelCitiesOf: (
  game: Game,
  loser: Player,
  lost: City
) => City[];
/** Whether `city` has its Palace standing. */
export declare const hasPalace: (game: Game, city: City) => boolean;

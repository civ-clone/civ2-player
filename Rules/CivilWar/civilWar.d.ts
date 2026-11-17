import { Game } from '@civ-clone/core-game';
import Rule from '@civ-clone/core-rule/Rule';
/**
 * Where the civil war runs among a capture's rules: first, as `city_capture_aftermath` decides it before the plunder's
 *  share (civ2-city's `High` snapshot reads the loser's halved gold) and before the Palace escape (civ2-city-improvement).
 */
export declare const civilWarPriority = 900;
/** `civ_create`'s last-contact turn for the rebels with everyone: 8 turns ago (civ.cpp:7477). */
export declare const rebelsLastContactTurnsAgo = 8;
/**
 * Civilization II's civil war (OpenCiv2 `src/auto/city.cpp` `city_capture_aftermath` :5441-5460, `src/auto/civ.cpp`
 *  `civ_civil_war` :7393, richardpenman/civ2@49f26ec), on `base-civil-war`. When a computer player with more than 4
 *  cities loses its capital to someone weaker, it splits: the rebels take a free civilization slot, the cities
 *  `RebelCities` picks, half the gold, the government, what it knows and sees, and a war with the loser; each side's
 *  Palace goes to its most central city. With no free slot the loser keeps everything, its Palace can't escape and its
 *  most central city starts building a new one.
 */
export declare const getRules: (game: Game) => Rule<any, any>[];
export default getRules;

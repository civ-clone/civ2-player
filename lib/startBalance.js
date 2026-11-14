"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBonuses = exports.startScores = exports.civ2Distance = void 0;
// Civilization II's start balancing (OpenCiv2 `src/auto/game.cpp` `game_balance_start_positions`,
//  richardpenman/civ2@49f26ec): once every civilization has its start, each start is scored, and a civilization whose
//  score falls more than 3 short of the best gets an extra Settlers, and every one short of the best gets an advance
//  for each point it is still short.
/**
 * Civilization II's `map_distance_diag` between two squares of a staggered map, as the game stores them: each row's
 * squares are 2 apart, odd rows shifted by 1, so the horizontal difference counts half squares. It wraps east to west
 * (`map_dx_wrapped`) and, from the two differences, `dist_from_deltas` gives the larger less half the excess of half
 * their sum over the smaller, rounded up.
 */
const civ2Distance = (x1, y1, x2, y2, width) => {
    let dx = Math.abs(2 * x1 + (y1 & 1) - (2 * x2 + (y2 & 1)));
    if (dx > width) {
        dx = 2 * width - dx;
    }
    const dy = Math.abs(y1 - y2), halfSum = (dx + dy) >> 1;
    return dy < dx
        ? dx - ((halfSum - dy + 1) >> 1)
        : dy - ((halfSum - dx + 1) >> 1);
};
exports.civ2Distance = civ2Distance;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
/**
 * Each start's score, from the C:
 *
 * - **Room:** with the nearest other start on the same land mass at least 10 away, +1 under 20, +2 from 20, and alone
 *   on its land mass, +3 to +6 by its squares / 50.
 * - **Land:** with 4 or more rivers among the city's squares +4; otherwise +2 with more than 3 Grassland.
 * - **Size:** +0 to +3 by the land mass's squares / 50.
 */
const startScores = (sites, width) => sites.map((site) => {
    let score = 0, nearest = 999;
    sites.forEach((other) => {
        if (other === site || other.landMass !== site.landMass) {
            return;
        }
        const distance = (0, exports.civ2Distance)(site.tile.x(), site.tile.y(), other.tile.x(), other.tile.y(), width);
        if (distance < nearest) {
            nearest = distance;
        }
    });
    const size = Math.trunc(site.landMassSquares / 50);
    if (nearest > 9) {
        if (nearest < 20) {
            score++;
        }
        else if (nearest === 999) {
            score += clamp(size, 3, 6);
        }
        else {
            score += 2;
        }
    }
    if (site.rivers < 4) {
        if (site.grassland > 3) {
            score += 2;
        }
    }
    else {
        score += 4;
    }
    score += Math.min(size, 3);
    return score;
});
exports.startScores = startScores;
/**
 * What each start gets, from its score and the best: an extra Settlers when more than 3 short (or a person's on Deity),
 * which counts as 3 more points (1 for a person on Deity), and an advance for each point still short.
 */
const startBonuses = (scores, humans, deity) => {
    const best = Math.max(0, ...scores);
    return scores.map((score, index) => {
        let settled = score;
        const settlers = best - score > 3 || (humans[index] && deity);
        if (settlers) {
            settled += !humans[index] || !deity ? 3 : 1;
        }
        return { settlers, advances: Math.max(0, best - settled) };
    });
};
exports.startBonuses = startBonuses;
//# sourceMappingURL=startBalance.js.map
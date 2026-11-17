import City from '@civ-clone/core-city/City';
import { Game } from '@civ-clone/core-game';
import Gold from '@civ-clone/base-city-yield-gold/Gold';
import LandMass from '@civ-clone/core-world/LandMass';
import { Palace } from '@civ-clone/civ2-city-improvement/CityImprovements';
import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
import { civ2Distance } from './startBalance';
import isBarbarian from '@civ-clone/base-civilization-barbarian/isBarbarian';
import isHuman from '@civ-clone/civ2-difficulty/isHuman';
import { power, powerRanks } from '@civ-clone/civ2-city/lib/capture';

// Civilization II's civil war (OpenCiv2 `src/auto/city.cpp` `city_capture_aftermath` 0057b5df, :5441-5460, and
//  `src/auto/civ.cpp` `civ_civil_war` :7393, `civ_find_central_city` :7361, richardpenman/civ2@49f26ec), on
//  `base-civil-war`. Civilization II numbers its civilizations 1 to 7 and splits one only into a free number; here
//  there are no numbers, so a civil war can always add the rebels, and a rank is only ever compared with a rank.

/** How much gold `player` has. */
export const goldOf = (game: Game, player: Player): number =>
  game.playerTreasuries
    .getByPlayer(player)
    .find((treasury) => treasury.yield() === Gold)
    ?.value() ?? 0;

/**
 * Each civilization's power rank as `civ_update_power_ranks` (civ.cpp:3072) works it out, the strongest 7 and down by
 *  one, the earlier player first on a tie, from civ2-city's `power` (3 an advance, 8 a citizen and a 32nd of its gold),
 *  with `city` still counted as `loser`'s, as it is through `city_capture_aftermath`. The barbarians have none (0).
 */
export const captureRanks = (
  game: Game,
  city: City,
  loser: Player
): Map<Player, number> => {
  const sizeOf = (city: City): number => game.cityGrowth.getByCity(city).size(),
    players = game.players
      .entries()
      .filter((player: Player): boolean => !isBarbarian(player));

  [loser].forEach((player: Player): void => {
    if (!players.includes(player) && !isBarbarian(player)) {
      players.push(player);
    }
  });

  return powerRanks(
    players.map((player: Player): [Player, number] => {
      let advances = 0;

      try {
        advances = game.playerResearch.getByPlayer(player).complete().length;
      } catch (e) {
        advances = 0;
      }

      const citySize =
        game.cities
          .getByPlayer(player)
          .filter((other: City): boolean => other !== city)
          .reduce((total: number, other: City) => total + sizeOf(other), 0) +
        (player === loser ? sizeOf(city) : 0);

      return [player, power(advances, citySize, goldOf(game, player))];
    })
  );
};

/** The rank of the weakest civilization a person plays (`game.worst_human_rank`): 0 when no one plays. */
export const worstHumanRank = (
  game: Game,
  ranks: Map<Player, number>
): number => {
  const humanRanks = [...ranks.entries()]
    .filter(([player]): boolean => isHuman(player, game.clients))
    .map(([, rank]): number => rank);

  return humanRanks.length === 0 ? 0 : Math.min(...humanRanks);
};

/**
 * Whether taking `city` counts as the loser beaten by someone weaker (`city_capture_aftermath`, city.cpp:5441-5450): a
 *  person who took it ranks below the loser; for a computer player (or the barbarians), the weakest person ranks below
 *  the loser, so with no person in the game, any loser. The original reads the rank of the civilization numbered as the
 *  weakest person's rank (`power_rank[worst_human_rank]`); with no civilization numbers here, it is that rank itself.
 */
export const isWeaker = (
  game: Game,
  city: City,
  captor: Player,
  loser: Player
): boolean => {
  const ranks = captureRanks(game, city, loser),
    loserRank = ranks.get(loser) ?? 0;

  if (!isBarbarian(captor) && isHuman(captor, game.clients)) {
    return (ranks.get(captor) ?? 0) < loserRank;
  }

  // With no person, the original compares the barbarians' rank, 0, which every civilization's beats (its ranks run 1 to
  //  7); here a game can have more than 7, ranked 0 and below, so no person means yes.
  if (
    ![...ranks.keys()].some((player: Player): boolean =>
      isHuman(player, game.clients)
    )
  ) {
    return true;
  }

  return worstHumanRank(game, ranks) < loserRank;
};

/** `map_distance_diag` between two squares on Civilization II's isometric map; the world's own distance on any other. */
export const distanceBetween = (from: Tile, to: Tile): number =>
  from.map().topologyId() === 'staggered-iso'
    ? civ2Distance(from.x(), from.y(), to.x(), to.y(), from.map().width())
    : Math.round(from.distanceFrom(to));

/**
 * `civ_find_central_city` (civ.cpp:7361): the city with the least total distance to all of `cities`, the first on a
 *  tie; `null` with none.
 */
export const centralCity = (cities: City[]): City | null => {
  let best: City | null = null,
    bestTotal = 0x7fff;

  cities.forEach((city: City): void => {
    const total = cities.reduce(
      (sum: number, other: City): number =>
        sum + distanceBetween(city.tile(), other.tile()),
      0
    );

    if (total < bestTotal) {
      bestTotal = total;
      best = city;
    }
  });

  return best;
};

/**
 * The cities that join the rebels (`civ_civil_war`, civ.cpp:7442-7563). `lost` is the capital just taken, counted with
 *  the loser's cities as it still is in the original, and the centre the distances are measured from.
 *  - city sizes are summed by land mass; walking the land masses in order, the capital's is loyal, and each other goes
 *    to the rebels unless the rebels already hold more than the loyal side;
 *  - if the loyal side holds at least as much as the rebels, but less than twice, the rebels take those land masses;
 *  - otherwise the rebels take the cities farthest from the capital (more than 1 away), one at a time, until they hold
 *    a third of the loser's citizens.
 */
export const rebelCitiesOf = (
  game: Game,
  loser: Player,
  lost: City
): City[] => {
  const sizeOf = (city: City): number => game.cityGrowth.getByCity(city).size(),
    cities = game.cities
      .entries()
      .filter(
        (city: City): boolean =>
          !city.destroyed() && (city === lost || city.player() === loser)
      ),
    landMassOf = (city: City): LandMass | null =>
      game.landMasses.getByTile(city.tile()),
    sizes = new Map<LandMass | null, number>(),
    capital = landMassOf(lost);

  cities.forEach((city: City): void => {
    const landMass = landMassOf(city);

    sizes.set(landMass, (sizes.get(landMass) ?? 0) + sizeOf(city));
  });

  const order = [
      ...game.landMasses.entries(),
      ...(sizes.has(null) ? [null] : []),
    ].filter((landMass) => (sizes.get(landMass) ?? 0) !== 0),
    rebelLandMasses = new Set<LandMass | null>();

  let loyal = sizes.get(capital) ?? 0,
    rebel = 0;

  order.forEach((landMass): void => {
    const size = sizes.get(landMass)!;

    if (loyal < rebel || landMass === capital) {
      if (landMass !== capital) {
        loyal += size;
      }

      return;
    }

    rebel += size;
    rebelLandMasses.add(landMass);
  });

  if (loyal < rebel * 2 && rebel <= loyal) {
    return cities.filter(
      (city: City): boolean =>
        city !== lost && rebelLandMasses.has(landMassOf(city))
    );
  }

  const total = cities.reduce(
      (sum: number, city: City): number => sum + sizeOf(city),
      0
    ),
    remaining = cities.filter((city: City): boolean => city !== lost),
    chosen: City[] = [];

  rebel = 0;

  while (rebel * 3 < total) {
    let farthest: City | null = null,
      maximum = 1;

    remaining.forEach((city: City): void => {
      const distance = distanceBetween(lost.tile(), city.tile());

      if (maximum < distance) {
        maximum = distance;
        farthest = city;
      }
    });

    if (farthest === null) {
      break;
    }

    rebel += sizeOf(farthest);
    chosen.push(farthest);
    remaining.splice(remaining.indexOf(farthest), 1);
  }

  return chosen;
};

/** Whether `city` has its Palace standing. */
export const hasPalace = (game: Game, city: City): boolean =>
  game.cityImprovements
    .getByCity(city)
    .some((improvement) => improvement instanceof Palace);

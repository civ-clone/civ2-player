import {
  AGGRESSOR,
  AGGRESSOR_LONG,
  setFlag,
} from '@civ-clone/civ2-diplomacy/lib/flags';
import {
  CIVIL_WAR_CAPITAL_RULE,
  CIVIL_WAR_CITIES_RULE,
  CIVIL_WAR_COMPUTER_RULE,
  CIVIL_WAR_RULE,
  CIVIL_WAR_WEAKER_RULE,
  REBEL_CITIES_RULE,
} from '../../RuleIds';
import {
  centralCity,
  goldOf,
  hasPalace,
  isWeaker,
  rebelCitiesOf,
} from '../../lib/civilWar';
import civilWar, { breaksOut } from '@civ-clone/base-civil-war/lib/civilWar';
import Captured from '@civ-clone/core-city/Rules/Captured';
import City from '@civ-clone/core-city/City';
import CivilWar from '@civ-clone/base-civil-war/Rules/CivilWar';
import Criterion from '@civ-clone/core-rule/Criterion';
import Effect from '@civ-clone/core-rule/Effect';
import { Game } from '@civ-clone/core-game';
import Gold from '@civ-clone/base-city-yield-gold/Gold';
import Government from '@civ-clone/core-government/Government';
import Never from '@civ-clone/core-diplomacy/Expiries/Never';
import { Palace } from '@civ-clone/civ2-city-improvement/CityImprovements';
import Player from '@civ-clone/core-player/Player';
import PlayerTile from '@civ-clone/core-player-world/PlayerTile';
import Priority from '@civ-clone/core-rule/Priority';
import RebelCities from '@civ-clone/base-civil-war/Rules/RebelCities';
import Research from '@civ-clone/core-science/Yields/Research';
import Rule from '@civ-clone/core-rule/Rule';
import Seceded from '@civ-clone/base-civil-war/Rules/Seceded';
import War from '@civ-clone/base-diplomacy-declaration-war/War';
import { barPalaceEscape } from '@civ-clone/civ2-city-improvement/lib/capital';
import cancelSpaceship from '@civ-clone/base-spaceship/lib/cancelSpaceship';
import isBarbarian from '@civ-clone/base-civilization-barbarian/isBarbarian';
import isHuman from '@civ-clone/civ2-difficulty/isHuman';
import makeContact from '@civ-clone/base-diplomacy-interaction-contact/makeContact';
import { recordContact } from '@civ-clone/base-diplomacy/lib/lastContact';

/**
 * Where the civil war runs among a capture's rules: first, as `city_capture_aftermath` decides it before the plunder's
 *  share (civ2-city's `High` snapshot reads the loser's halved gold) and before the Palace escape (civ2-city-improvement).
 */
export const civilWarPriority = 900;

/** `civ_create`'s last-contact turn for the rebels with everyone: 8 turns ago (civ.cpp:7477). */
export const rebelsLastContactTurnsAgo = 8;

/**
 * Civilization II's civil war (OpenCiv2 `src/auto/city.cpp` `city_capture_aftermath` :5441-5460, `src/auto/civ.cpp`
 *  `civ_civil_war` :7393, richardpenman/civ2@49f26ec), on `base-civil-war`. When a computer player with more than 4
 *  cities loses its capital to someone weaker, it splits: the rebels take a free civilization slot, the cities
 *  `RebelCities` picks, half the gold, the government, what it knows and sees, and a war with the loser; each side's
 *  Palace goes to its most central city. With no free slot the loser keeps everything, its Palace can't escape and its
 *  most central city starts building a new one.
 */
export const getRules = (game: Game): Rule<any, any>[] => {
  const fail = (city: City, loser: Player): void => {
    barPalaceEscape(city);
    // No escape, so the ship is lost (`civ_spaceship_lost_notify`).
    cancelSpaceship(loser, game.spaceships);

    const central = centralCity(game.cities.getByPlayer(loser));

    if (central === null) {
      return;
    }

    try {
      game.cityBuilds.getByCity(central).build(Palace);
    } catch (e) {
      // Nothing to build it with: the rebuilding is left to the computer player's own choices.
    }
  };

  return [
    new CivilWar(
      CIVIL_WAR_COMPUTER_RULE,
      new Effect(
        (city: City, captor: Player, loser: Player): boolean =>
          !isBarbarian(loser) && !isHuman(loser, game.clients)
      )
    ),
    new CivilWar(
      CIVIL_WAR_CAPITAL_RULE,
      new Effect((city: City): boolean => hasPalace(game, city))
    ),
    new CivilWar(
      CIVIL_WAR_CITIES_RULE,
      // The city taken is still the loser's in the original (`civs[civ2].num_cities`).
      new Effect(
        (city: City, captor: Player, loser: Player): boolean =>
          game.cities.getByPlayer(loser).length + 1 > 4
      )
    ),
    new CivilWar(
      CIVIL_WAR_WEAKER_RULE,
      new Effect((city: City, captor: Player, loser: Player): boolean =>
        isWeaker(game, city, captor, loser)
      )
    ),

    new RebelCities(
      REBEL_CITIES_RULE,
      new Effect((loser: Player, lost: City): City[] =>
        rebelCitiesOf(game, loser, lost)
      )
    ),

    new Captured(
      CIVIL_WAR_RULE,
      new Priority(civilWarPriority),
      new Criterion((city: City, captor: Player, loser: Player): boolean =>
        breaksOut(city, captor, loser, game.rules)
      ),
      new Effect((city: City, captor: Player, loser: Player): void => {
        // The original needs a free civilization number (`civ_civil_war`, civ.cpp:7430-7437) and gives the loser a new
        //  Palace site without one; here a player can always be added, so it fails only with no civilization left.
        if (civilWar(game, loser, city) === null) {
          fail(city, loser);
        }

        // Otherwise the loser's ship is lost unless its Palace escapes after all: civ2-city-improvement's escape rule,
        //  run next with what the war left it, loses it (`city_capture_aftermath_palace_escape` with no `city4`).
      })
    ),

    // What the rebels take besides their cities (`civ_civil_war`, civ.cpp:7468-7500): half the gold, rounded down…
    new Seceded(
      'civ2-player:civil-war/seceded/gold',
      new Effect((rebels: Player, loser: Player): void => {
        const half = Math.floor(goldOf(game, loser) / 2),
          treasury = (player: Player) =>
            game.playerTreasuries
              .getByPlayer(player)
              .find((treasury) => treasury.yield() === Gold);

        treasury(loser)?.subtract(half);
        treasury(rebels)?.add(half);
      })
    ),

    // …the government…
    new Seceded(
      'civ2-player:civil-war/seceded/government',
      new Effect((rebels: Player, loser: Player): void => {
        const current = game.playerGovernments.getByPlayer(loser).current();

        if (current === null) {
          return;
        }

        game.playerGovernments
          .getByPlayer(rebels)
          .set(new (current.constructor as typeof Government)());
      })
    ),

    // …the research so far (base-civil-war gives the advances), toward what the loser is researching…
    new Seceded(
      'civ2-player:civil-war/seceded/research',
      new Effect((rebels: Player, loser: Player): void => {
        const from = game.playerResearch.getByPlayer(loser),
          to = game.playerResearch.getByPlayer(rebels),
          researching = from.researching();

        if (researching === null) {
          return;
        }

        try {
          to.research(researching);
          to.add(new Research(from.progress().value()));
        } catch (e) {
          // Not one the rebels can research: they choose their own.
        }
      })
    ),

    // …every square the loser has seen…
    new Seceded(
      'civ2-player:civil-war/seceded/map',
      new Effect((rebels: Player, loser: Player): void => {
        game.playerWorlds.getByPlayer(rebels).register(
          ...game.playerWorlds
            .getByPlayer(loser)
            .entries()
            .map((tile: PlayerTile) => tile.tile())
        );
      })
    ),

    // …and a war: the rebels at war with the loser, and the loser the aggressor (`0x82801` its way, `0x2001` theirs).
    //  Everyone counts as having been in contact with them 8 turns ago.
    new Seceded(
      'civ2-player:civil-war/seceded/war',
      new Effect((rebels: Player, loser: Player): void => {
        const registries = {
          interactionRegistry: game.interactions,
          ruleRegistry: game.rules,
          turn: game.turn,
        };

        makeContact(game.interactions, rebels, loser, game.rules, game.turn);

        game.interactions.register(
          new War(rebels, loser, new Never(), game.rules)
        );

        setFlag(registries, loser, rebels, AGGRESSOR | AGGRESSOR_LONG);

        game.players
          .entries()
          .filter(
            (other: Player): boolean => other !== rebels && !isBarbarian(other)
          )
          .forEach((other: Player): void =>
            recordContact(
              registries,
              other,
              rebels,
              game.turn.value() - rebelsLastContactTurnsAgo
            )
          );
      })
    ),

    // Each side's Palace in its most central city (`civ_find_central_city`): the captured capital is no longer the
    //  loser's.
    new Seceded(
      'civ2-player:civil-war/seceded/palaces',
      new Effect((rebels: Player, loser: Player): void =>
        [rebels, loser].forEach((player: Player): void => {
          const central = centralCity(game.cities.getByPlayer(player));

          if (central !== null && !hasPalace(game, central)) {
            new Palace(central, game.rules);
          }
        })
      )
    ),
  ];
};

export default getRules;

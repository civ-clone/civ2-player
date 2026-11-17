import {
  AGGRESSOR,
  AGGRESSOR_LONG,
  hasFlag,
} from '@civ-clone/civ2-diplomacy/lib/flags';
import { CIVIL_WAR_RULE } from '../RuleIds';
import { Land, Water } from '@civ-clone/core-terrain/Types';
import { centralCity, isWeaker, rebelCitiesOf } from '../lib/civilWar';
import { AIClient } from '@civ-clone/core-ai-client/AIClient';
import Added from '@civ-clone/core-player/Rules/Added';
import Advance from '@civ-clone/core-science/Advance';
import Captured from '@civ-clone/core-city/Rules/Captured';
import City from '@civ-clone/core-city/City';
import CityGrowth from '@civ-clone/core-city-growth/CityGrowth';
import Civilization from '@civ-clone/core-civilization/Civilization';
import Client from '@civ-clone/core-client/Client';
import { DefendRole } from '@civ-clone/base-unit-role/Roles';
import Effect from '@civ-clone/core-rule/Effect';
import { Game } from '@civ-clone/core-game';
import Generator from '@civ-clone/core-world-generator/Generator';
import Gold from '@civ-clone/base-city-yield-gold/Gold';
import Government from '@civ-clone/core-government/Government';
import Leader from '@civ-clone/core-civilization/Leader';
import { Palace } from '@civ-clone/civ2-city-improvement/CityImprovements';
import Player from '@civ-clone/core-player/Player';
import PlayerGovernment from '@civ-clone/core-government/PlayerGovernment';
import PlayerResearch from '@civ-clone/core-science/PlayerResearch';
import PlayerTreasury from '@civ-clone/core-treasury/PlayerTreasury';
import Terrain from '@civ-clone/core-terrain/Terrain';
import Unit from '@civ-clone/core-unit/Unit';
import UnitRoles from '@civ-clone/base-unit-role/Rules/UnitRoles';
import Spaceship from '@civ-clone/core-spaceship/Spaceship';
import War from '@civ-clone/base-diplomacy-declaration-war/War';
import World from '@civ-clone/core-world/World';
import addPlayerHoldingOff from '@civ-clone/base-game-end/lib/addPlayerHoldingOff';
import { expect } from 'chai';
import { palaceEscapeBarred } from '@civ-clone/civ2-city-improvement/lib/capital';
import civilWarRules from '../Rules/CivilWar/civilWar';
import improvementCreated from '@civ-clone/civ2-city-improvement/Rules/CityImprovement/created';
import palaceCaptured from '@civ-clone/civ2-city-improvement/Rules/City/captured';

// Toy civilizations, one for each colour set, with a leader each.
const colours: [string, number][] = [
    ['Reds', 1],
    ['Oranges', 2],
    ['Yellows', 3],
    ['Greens', 4],
    ['Blues', 5],
    ['Indigos', 6],
    ['Violets', 7],
    ['Pinks', 7],
  ],
  civilizations = new Map<string, typeof Civilization>(),
  leaders = new Map<typeof Civilization, typeof Leader>();

colours.forEach(([name]) => {
  const CivilizationType = class extends Civilization {},
    LeaderType = class extends Leader {
      static civilization(): typeof Civilization {
        return CivilizationType;
      }
    };

  Object.defineProperty(CivilizationType, 'name', { value: name });
  civilizations.set(name, CivilizationType);
  leaders.set(CivilizationType, LeaderType);
});

class Ocean extends Water {}
class Plain extends Land {}

class Warrior extends Unit {}
class Pottery extends Advance {}

class Despots extends Government {}
class Kings extends Government {}

class DrawnGenerator extends Generator {
  #rows: string[];
  #game: Game;

  constructor(rows: string[], game: Game) {
    super(rows.length, rows[0].length);

    this.#rows = rows;
    this.#game = game;
  }

  async generate(): Promise<Terrain[]> {
    return this.#rows
      .join('')
      .split('')
      .map(
        (letter: string): Terrain =>
          letter === '~'
            ? new Ocean(this.#game.rules)
            : new Plain(this.#game.rules)
      );
  }
}

const names = (cities: City[]): string[] => cities.map((city) => city.name());

const setUp = async (
  rows: string[] = Array.from({ length: 10 }, () => '..........')
) => {
  const game = new Game(),
    world = await new World(
      new DrawnGenerator(rows, game),
      game.rules,
      game.landMasses
    ).build();

  game.civilizations.register(...civilizations.values());
  game.leaders.register(...leaders.values());

  game.rules.register(
    new Added(
      new Effect((player: Player): void => {
        game.playerResearch.register(
          new PlayerResearch(player, game.advances, game.rules)
        );
        game.playerTreasuries.register(
          new PlayerTreasury(player, Gold, game.cityBuilds, game.rules)
        );

        const government = new PlayerGovernment(
          player,
          game.availableGovernments,
          game.rules
        );

        government.set(new Despots());
        game.playerGovernments.register(government);
      })
    ),
    new UnitRoles(
      new Effect((UnitType: typeof Unit) =>
        UnitType === Warrior ? DefendRole : null
      )
    ),
    ...improvementCreated(game.cityImprovements, game.engine),
    ...civilWarRules(game)
  );

  const join = (name: string, human = false): Player => {
      const player = addPlayerHoldingOff(game, world, [], {
          civilization: civilizations.get(name),
        }),
        client = Object.create((human ? Client : AIClient).prototype) as Client;

      Object.assign(client, { player: () => player });
      game.clients.register(client);

      return player;
    },
    city = (player: Player, x: number, y: number, size = 1): City => {
      const city = new City(player, world.get(x, y), `${x},${y}`, game.rules),
        growth = new CityGrowth(city, game.rules);

      game.cities.register(city);
      game.cityGrowth.register(growth);

      for (let i = 1; i < size; i++) {
        growth.grow();
      }

      return city;
    },
    unit = (
      Type: typeof Unit,
      player: Player,
      home: City | null,
      x: number,
      y: number
    ): Unit => {
      const unit = new Type(home, player, world.get(x, y), game.rules);

      game.units.register(unit);

      return unit;
    },
    gold = (player: Player): PlayerTreasury =>
      game.playerTreasuries
        .getByPlayer(player)
        .find((treasury) => treasury.yield() === Gold) as PlayerTreasury;

  return { city, game, gold, join, unit, world };
};

describe('civil war: the trigger (city_capture_aftermath :5441-5460)', (): void => {
  const fiveCities = async ({
    human = false,
    capturedBy = 'computer' as 'computer' | 'person',
  } = {}) => {
    const set = await setUp(),
      { city, game, join } = set,
      loser = join('Reds', human),
      captor = join('Oranges', capturedBy === 'person'),
      capital = city(loser, 0, 0, 3),
      others = [2, 4, 6, 8].map((x) => city(loser, x, 4, 2));

    new Palace(capital, game.rules);

    return { ...set, captor, capital, loser, others };
  };

  it('needs a computer loser with more than 4 cities, the one taken included, losing its Palace city', async (): Promise<void> => {
    const again = await fiveCities(),
      check = (city: City, by: Player, from: Player) =>
        again.game.rules
          .get(Captured)
          .find((rule) => rule.id() === CIVIL_WAR_RULE)!
          .validate(city, by, from);

    // As the rules see a capture, the city is the captor's already (moved without its `Captured` rules here). The
    //  capital qualifies: 4 left and the one taken. A city without the Palace doesn't.
    again.capital.transfer(again.captor);
    expect(check(again.capital, again.captor, again.loser)).to.equal(true);
    expect(check(again.others[0], again.captor, again.loser)).to.equal(false);

    // With 4 cities, the one taken included, it doesn't.
    again.others[0].destroy();
    expect(check(again.capital, again.captor, again.loser)).to.equal(false);
  });

  it("never splits a person's civilization", async (): Promise<void> => {
    const { capital, captor, game, loser } = await fiveCities({ human: true });

    expect(
      game.rules
        .get(Captured)
        .find((rule) => rule.id() === CIVIL_WAR_RULE)!
        .validate(capital, captor, loser)
    ).to.equal(false);
  });

  it('a person must rank below the loser', async (): Promise<void> => {
    const { capital, captor, game, gold, loser } = await fiveCities({
      capturedBy: 'person',
    });

    // Reds: 11 citizens × 8 = 88. Oranges: nothing: rank 6 against 7.
    expect(isWeaker(game, capital, captor, loser)).to.equal(true);

    // Oranges with 32 × 89 gold: power 89 > 88.
    gold(captor).add(32 * 89);
    expect(isWeaker(game, capital, captor, loser)).to.equal(false);
  });

  it('a computer captor needs the weakest person to rank below the loser, or no person in the game', async (): Promise<void> => {
    const { capital, captor, city, game, gold, join, loser } =
        await fiveCities(),
      person = join('Yellows', true);

    // Reds 88 (rank 7), Oranges 10 (6), Yellows 8 (5): 5 < 7.
    gold(captor).add(32 * 10);
    city(person, 9, 9, 1);
    expect(isWeaker(game, capital, captor, loser)).to.equal(true);

    // The person the strongest: 7, Reds 6.
    gold(person).add(32 * 200);
    expect(isWeaker(game, capital, captor, loser)).to.equal(false);
  });

  it('with no person, any loser, however many players rank above it (more than 7 here, ranked 0 and below)', async (): Promise<void> => {
    const { capital, captor, game, gold, join, loser } = await fiveCities();

    ['Yellows', 'Greens', 'Blues', 'Indigos', 'Violets', 'Pinks'].forEach(
      (name) => gold(join(name)).add(32 * 1000)
    );
    gold(captor).add(32 * 1000);

    // 8 players, the Reds the weakest: rank 0.
    expect(game.players.entries()).length(8);
    expect(isWeaker(game, capital, captor, loser)).to.equal(true);
  });
});

describe('civil war: the rebel cities (civ_civil_war :7503-7563)', (): void => {
  it('takes whole land masses when the loyal side holds at least as much as the rebels, but less than twice', async (): Promise<void> => {
    // Land masses: columns 0-3 (the capital's), 5-6, 8.
    const rows = Array.from({ length: 10 }, () => '....~..~.~'),
      { city, game, join } = await setUp(rows),
      loser = join('Reds'),
      capital = city(loser, 0, 0, 4),
      home = city(loser, 2, 4, 2),
      east = city(loser, 5, 2, 3),
      far = city(loser, 8, 6, 1);

    // Loyal 6; 5-6: 3 (rebel, 3); 8: rebel holds 3, not more than 6, so 4. 4 ≤ 6 < 8: whole land masses.
    expect(names(rebelCitiesOf(game, loser, capital))).to.deep.equal(
      names([east, far])
    );
    expect(home).to.be.instanceOf(City);
  });

  it('otherwise takes the farthest cities, more than 1 away, until the rebels hold a third', async (): Promise<void> => {
    const { city, game, join } = await setUp(),
      loser = join('Reds'),
      capital = city(loser, 0, 0, 3),
      near = city(loser, 1, 0, 3),
      middle = city(loser, 3, 0, 3),
      far = city(loser, 4, 4, 2),
      farther = city(loser, 5, 5, 2);

    // One land mass: rebel 0 ≤ loyal, but loyal (14) isn't below 0: the farthest. 14 in all: 2, 2 + 2, then
    //  2 + 2 + 3 = 7 (21 ≥ 14). The nearest, 1 away, never goes.
    expect(names(rebelCitiesOf(game, loser, capital))).to.deep.equal(
      names([farther, far, middle])
    );
    expect(near.player()).to.equal(loser);
  });
});

describe('civil war: the split', (): void => {
  const war = async ({ civilizationsLeft = true } = {}) => {
    const set = await setUp(),
      { city, game, gold, join, unit } = set,
      loser = join('Reds'),
      captor = join('Oranges'),
      capital = city(loser, 0, 0, 4),
      near = city(loser, 2, 0, 2),
      far = city(loser, 5, 5, 3),
      farther = city(loser, 6, 6, 3),
      edge = city(loser, 1, 1, 1),
      guard = unit(Warrior, loser, farther, 6, 6),
      log: string[] = [];

    if (!civilizationsLeft) {
      game.civilizations.unregister(...game.civilizations.entries());
    }

    new Palace(capital, game.rules);
    gold(loser).add(301);
    game.playerResearch.getByPlayer(loser).addAdvance(Pottery);
    game.playerGovernments.getByPlayer(loser).set(new Kings());
    // A launched ship of the loser's.
    const ship = Object.assign(Object.create(Spaceship.prototype), {
      lost: false,
      player: () => loser,
      launched: () => 1,
      activeParts: () => [],
      inactiveParts: () => [],
      successful(this: { lost: boolean }) {
        return this.lost ? false : null;
      },
      lose(this: { lost: boolean }) {
        this.lost = true;
      },
    });

    game.spaceships.register(ship);
    game.engine.on('player:civil-war', (from: Player, rebels: Player) =>
      log.push(`civil war ${from === loser} ${game.players.includes(rebels)}`)
    );

    capital.capture(captor);

    return {
      ...set,
      capital,
      captor,
      edge,
      far,
      farther,
      guard,
      log,
      loser,
      near,
      ship,
    };
  };

  it('gives the rebels the cities, half the gold, the government, a war, and each side its Palace', async (): Promise<void> => {
    const {
        capital,
        captor,
        edge,
        far,
        farther,
        game,
        gold,
        guard,
        log,
        loser,
        near,
        ship,
      } = await war(),
      [rebels] = game.players
        .entries()
        .filter((player) => player !== loser && player !== captor);

    expect(log).to.deep.equal(['civil war true true']);
    // 13 citizens: farthest first, 3 + 3 = 6, a third.
    expect(farther.player()).to.equal(rebels);
    expect(far.player()).to.equal(rebels);
    expect(near.player()).to.equal(loser);
    expect(edge.player()).to.equal(loser);
    expect(guard.player()).to.equal(rebels);
    expect(gold(loser).value()).to.equal(151);
    expect(gold(rebels).value()).to.equal(150);
    expect(game.playerResearch.getByPlayer(rebels).completed(Pottery)).to.equal(
      true
    );
    expect(
      game.playerGovernments.getByPlayer(rebels).current()
    ).to.be.instanceOf(Kings);
    expect(
      game.interactions
        .getByPlayers(rebels, loser)
        .some((interaction) => interaction instanceof War)
    ).to.equal(true);
    expect(
      hasFlag(
        { interactionRegistry: game.interactions },
        loser,
        rebels,
        AGGRESSOR | AGGRESSOR_LONG
      )
    ).to.equal(true);

    const palaces = game.cityImprovements
      .getByType(Palace)
      .map((palace) => palace.city());

    // Each side's Palace in its most central city, the first on a tie: the rebels' in 5,5 (1 from 6,6), the loser's
    //  in 2,0 (1 from 1,1).
    expect(names(palaces)).to.include(far.name());
    expect(names(palaces)).to.include(near.name());
    expect(palaceEscapeBarred(capital)).to.equal(false);
    // The ship is civ2-city-improvement's escape rule's to lose, not registered here.
    expect(ship.lost).to.equal(false);
    expect(centralCity([near, edge])).to.equal(near);
  });

  it('with no civilization left for the rebels, bars the Palace escape and keeps every city', async (): Promise<void> => {
    const { capital, game, log, loser, ship } = await war({
      civilizationsLeft: false,
    });

    expect(ship.lost).to.equal(true);

    expect(log).to.deep.equal([]);
    expect(palaceEscapeBarred(capital)).to.equal(true);
    expect(game.cities.getByPlayer(loser)).to.have.length(4);
  });

  const withEscape = async ({
    civilizationsLeft = true,
    gold: start = 2001,
  } = {}) => {
    const set = await setUp(),
      { city, game, gold, join } = set,
      loser = join('Reds'),
      captor = join('Oranges'),
      capital = city(loser, 0, 0, 10),
      // Kept by the loser: the most central (registered first, on a tie) and the escape's city (size 8 or more).
      edge = city(loser, 1, 1, 1),
      near = city(loser, 2, 0, 8),
      far = city(loser, 5, 5, 6),
      farther = city(loser, 6, 6, 6),
      ship = Object.assign(Object.create(Spaceship.prototype), {
        lost: false,
        losses: 0,
        player: () => loser,
        launched: () => 1,
        activeParts: () => [],
        inactiveParts: () => [],
        successful(this: { lost: boolean }) {
          return this.lost ? false : null;
        },
        lose(this: { lost: boolean; losses: number }) {
          this.losses++;
          this.lost = true;
        },
      });

    game.spaceships.register(ship);
    // civ2-city-improvement's capture rules, after this package's.
    game.rules.register(
      ...palaceCaptured(
        {
          cityGrowthRegistry: game.cityGrowth,
          cityImprovementRegistry: game.cityImprovements,
          cityRegistry: game.cities,
          clientRegistry: game.clients,
          gameDifficultyRegistry: game.difficulty,
          landMassRegistry: game.landMasses,
          playerResearchRegistry: game.playerResearch,
          playerTreasuryRegistry: game.playerTreasuries,
          requirementRegistry: game.requirements,
          ruleRegistry: game.rules,
          spaceshipRegistry: game.spaceships,
          unitRegistry: game.units,
          wonderRegistry: game.wonders,
        } as any,
        () => 0.9
      )
    );

    if (!civilizationsLeft) {
      game.civilizations.unregister(...game.civilizations.entries());
    }

    new Palace(capital, game.rules);
    // 2001: 1001 left after the rebels' half, enough to escape with a ship (King, the level a game without one plays).
    gold(loser).add(start);
    capital.capture(captor);

    const palaces = (): string[] =>
      names(
        game.cityImprovements.getByType(Palace).map((palace) => palace.city())
      );

    return {
      capital,
      edge,
      far,
      farther,
      game,
      gold,
      loser,
      near,
      palaces,
      ship,
    };
  };

  it("runs before civ2-city-improvement's Palace escape, which then moves the loser's Palace and keeps its ship", async (): Promise<void> => {
    const { far, farther, gold, loser, near, palaces, ship } =
      await withEscape();

    expect(far.player()).not.equal(loser);
    expect(farther.player()).not.equal(loser);
    // The rebels' Palace in 5,5; the loser's moved from 1,1 (its central city) to 2,0 for 1000 gold.
    expect(palaces().sort()).to.deep.equal(['2,0', '5,5']);
    expect(near.player()).equal(loser);
    expect(gold(loser).value()).equal(1);
    expect(ship.lost).equal(false);
  });

  it("loses the loser's ship once when its Palace doesn't escape after the split", async (): Promise<void> => {
    // 1998: 999 left after the rebels' half, less than the 1000 the escape costs.
    const { gold, loser, palaces, ship } = await withEscape({ gold: 1998 });

    expect(gold(loser).value()).equal(999);
    // The loser's Palace stays in its central city, 1,1.
    expect(palaces().sort()).to.deep.equal(['1,1', '5,5']);
    expect(ship.losses).equal(1);
  });

  it('with no civilization left, leaves no Palace escape for civ2-city-improvement to offer', async (): Promise<void> => {
    const { gold, loser, palaces, ship } = await withEscape({
      civilizationsLeft: false,
    });

    expect(palaces()).to.deep.equal([]);
    expect(gold(loser).value()).equal(2001);
    expect(ship.losses).equal(1);
  });
});

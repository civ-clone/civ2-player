import { civ2Distance, startBonuses, startScores } from '../lib/startBalance';
import { describe, it } from 'mocha';
import AIClient from '@civ-clone/core-ai-client/AIClient';
import AdvanceRegistry from '@civ-clone/core-science/AdvanceRegistry';
import Babylonian from '@civ-clone/base-civilization-babylonian/Babylonian';
import Client from '@civ-clone/core-client/Client';
import ClientRegistry from '@civ-clone/core-client/ClientRegistry';
import Created from '@civ-clone/core-unit/Rules/Created';
import Effect from '@civ-clone/core-rule/Effect';
import GameDifficultyRegistry from '@civ-clone/core-difficulty/GameDifficultyRegistry';
import Generator from './lib/Generator';
import Grassland from '@civ-clone/base-terrain-grassland/Grassland';
import Player from '@civ-clone/core-player/Player';
import PlayerResearch from '@civ-clone/core-science/PlayerResearch';
import PlayerResearchRegistry from '@civ-clone/core-science/PlayerResearchRegistry';
import River from '@civ-clone/base-terrain-feature-river/River';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import TerrainFeatureRegistry from '@civ-clone/core-terrain-feature/TerrainFeatureRegistry';
import Tile from '@civ-clone/core-world/Tile';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';
import World from '@civ-clone/core-world/World';
import * as Advances from '@civ-clone/civ2-science/Advances';
import { advances } from '@civ-clone/civ2-science/data/advances';
import balanceStarts, {
  StartNotOnLandError,
  siteOf,
} from '../lib/balanceStarts';
import Built from '@civ-clone/core-world/Rules/Built';
import CivilizationRegistry from '@civ-clone/core-civilization/CivilizationRegistry';
import Engine from '@civ-clone/core-engine/Engine';
import Hammurabi from '@civ-clone/base-civilization-babylonian/Leaders/Hammurabi';
import LandMassRegistry from '@civ-clone/core-world/LandMassRegistry';
import LeaderRegistry from '@civ-clone/core-civilization/LeaderRegistry';
import Ocean from '@civ-clone/base-terrain-ocean/Ocean';
import PickStartTile from '@civ-clone/core-world-generator/Rules/PickStartTile';
import PlayerRegistry from '@civ-clone/core-player/PlayerRegistry';
import PlayerWorldRegistry from '@civ-clone/core-player-world/PlayerWorldRegistry';
import Settlers from '@civ-clone/base-unit-settlers/Settlers';
import StartTiles from '../lib/startTiles';
import built from '../Rules/World/built';
import spawn from '../Rules/Player/spawn';
import { expect } from 'chai';
import fatCross from '@civ-clone/base-city-tiles-fat-cross/lib/fatCross';

describe('civ2Distance', (): void => {
  it("measures Civilization II's staggered squares, wrapping east to west", (): void => {
    // The next square along a row, on the next row, or two rows down is 1 away. Along a row each square is a
    //  diagonal step of the underlying grid, so 5 along is 7 (`dist_from_deltas` of 10 half squares and 0 rows).
    expect(civ2Distance(0, 0, 1, 0, 10)).equal(1);
    expect(civ2Distance(0, 0, 0, 1, 10)).equal(1);
    expect(civ2Distance(0, 0, 0, 2, 10)).equal(1);
    expect(civ2Distance(0, 0, 9, 0, 10)).equal(1);
    expect(civ2Distance(1, 1, 8, 8, 10)).equal(7);
    expect(civ2Distance(0, 0, 5, 0, 40)).equal(7);
  });
});

describe('startScores', (): void => {
  const tile = (x: number, y: number) => ({ x: () => x, y: () => y } as Tile),
    site = (
      x: number,
      y: number,
      landMass: string,
      landMassSquares: number,
      grassland = 0,
      rivers = 0
    ) => ({ tile: tile(x, y), landMass, landMassSquares, grassland, rivers });

  it('scores room, rivers or grassland, and the land mass', (): void => {
    expect(
      startScores(
        [
          // Alone on 400 squares: 6 (clamped), rivers 4, size 3.
          site(0, 0, 'a', 400, 0, 4),
          // 12 from its neighbour on 120 squares: 1, grassland 2, size 2.
          site(0, 20, 'b', 120, 5, 3),
          site(12, 20, 'b', 120, 3, 0),
          // Alone on 60 squares: at least 3, size 1.
          site(0, 40, 'c', 60),
        ],
        80
      )
    ).eql([13, 5, 3, 4]);
    // 20 or more apart: 2.
    expect(startScores([site(0, 0, 'a', 10), site(25, 0, 'a', 10)], 80)).eql([
      2, 2,
    ]);
  });
});

describe('startBonuses', (): void => {
  it('gives a Settlers more than 3 short, then an advance a point', (): void => {
    expect(
      startBonuses([10, 6, 7, 10], [false, false, false, false], false)
    ).eql([
      { settlers: false, advances: 0 },
      { settlers: true, advances: 1 },
      { settlers: false, advances: 3 },
      { settlers: false, advances: 0 },
    ]);
  });

  it('gives a person a Settlers on Deity, worth only 1 point', (): void => {
    expect(startBonuses([10, 4], [true, false], true)).eql([
      { settlers: true, advances: 0 },
      { settlers: true, advances: 3 },
    ]);
    expect(startBonuses([6, 10], [true, false], true)).eql([
      { settlers: true, advances: 3 },
      { settlers: false, advances: 0 },
    ]);
  });
});

describe('balanceStarts', (): void => {
  it('gives the poorer start an advance for each point it is short', async (): Promise<void> => {
    const ruleRegistry = new RuleRegistry(),
      terrainFeatureRegistry = new TerrainFeatureRegistry(),
      unitRegistry = new UnitRegistry(),
      clientRegistry = new ClientRegistry(),
      playerResearchRegistry = new PlayerResearchRegistry(),
      advanceRegistry = new AdvanceRegistry(),
      world = new World(
        new Generator(20, 20, () => new Grassland(ruleRegistry), {
          topologyId: 'staggered-iso',
        } as any),
        ruleRegistry
      );

    await world.build();

    advanceRegistry.register(...advances.map(([AdvanceType]) => AdvanceType));
    ruleRegistry.register(
      new Created(new Effect((unit) => unitRegistry.register(unit)))
    );

    const rich = world.get(4, 4),
      poor = world.get(14, 14);

    // Rivers all round the rich start.
    fatCross(rich)
      .entries()
      .forEach((tile: Tile) =>
        terrainFeatureRegistry.register(new River(tile.terrain()))
      );

    const players = [new Player(ruleRegistry), new Player(ruleRegistry)];

    players.forEach((player, index) => {
      player.setCivilization(new Babylonian());
      clientRegistry.register(
        index === 0 ? new Client(player) : new AIClient(player)
      );
      playerResearchRegistry.register(
        new PlayerResearch(player, advanceRegistry, ruleRegistry)
      );
    });

    // One land mass of 400 squares (size 3), 17 apart (room 1). Rich: 21 rivers, 4. Poor: 21 Grassland, 2. So 8 and
    //  6: no Settlers, 2 advances.
    balanceStarts(
      [
        [players[0], rich],
        [players[1], poor],
      ],
      world,
      {
        clientRegistry,
        gameDifficultyRegistry: new GameDifficultyRegistry(),
        playerResearchRegistry,
        ruleRegistry,
        terrainFeatureRegistry,
        randomNumberGenerator: () => 0.5,
      }
    );

    expect(siteOf(rich, world, terrainFeatureRegistry)).include({
      landMassSquares: 400,
      grassland: 21,
      rivers: 21,
    });
    expect(siteOf(poor, world, terrainFeatureRegistry)).include({
      landMassSquares: 400,
      grassland: 21,
      rivers: 0,
    });
    expect(unitRegistry.getByPlayer(players[0])).length(0);
    expect(unitRegistry.getByPlayer(players[1])).length(0);
    expect(playerResearchRegistry.getByPlayer(players[0]).complete()).length(0);

    const gained = playerResearchRegistry.getByPlayer(players[1]).complete();

    expect(gained).length(2);
    // Each one researchable when it was given: the first needs nothing.
    const [first] = gained,
      row = advances.find(([AdvanceType]) => first instanceof AdvanceType)!;

    expect([row[1], row[2]]).eql([-1, -1]);
  });

  it('balances as the world is built and the players seated, across land masses', async (): Promise<void> => {
    const ruleRegistry = new RuleRegistry(),
      terrainFeatureRegistry = new TerrainFeatureRegistry(),
      unitRegistry = new UnitRegistry(),
      clientRegistry = new ClientRegistry(),
      playerResearchRegistry = new PlayerResearchRegistry(),
      advanceRegistry = new AdvanceRegistry(),
      civilizationRegistry = new CivilizationRegistry(),
      leaderRegistry = new LeaderRegistry(),
      engine = new Engine(),
      startTiles = new StartTiles(),
      started: Promise<void> = new Promise((resolve) =>
        engine.on('game:start', resolve)
      ),
      // 20 × 20, with ocean in columns 0 and 10: two land masses of 180 squares.
      world = new World(
        new Generator(
          20,
          20,
          (i: number) =>
            i % 20 === 0 || i % 20 === 10
              ? new Ocean(ruleRegistry)
              : new Grassland(ruleRegistry),
          { topologyId: 'staggered-iso' } as any
        ),
        ruleRegistry,
        // Its own: the default registry holds every world's land masses.
        new LandMassRegistry()
      ),
      starts = [
        [4, 4],
        [14, 4],
        [16, 10],
      ],
      players = starts.map(() => new Player(ruleRegistry));

    advanceRegistry.register(...advances.map(([AdvanceType]) => AdvanceType));
    civilizationRegistry.register(Babylonian);
    leaderRegistry.register(Hammurabi);
    players.forEach((player) => {
      clientRegistry.register(new AIClient(player));
      playerResearchRegistry.register(
        new PlayerResearch(player, advanceRegistry, ruleRegistry)
      );
    });

    let seated = 0;

    ruleRegistry.register(
      new Created(new Effect((unit) => unitRegistry.register(unit))),
      // Rivers all round the lone start, before anyone is seated.
      new Built(
        new Effect((built: World): void =>
          fatCross(built.get(4, 4))
            .entries()
            .forEach((tile: Tile) =>
              terrainFeatureRegistry.register(new River(tile.terrain()))
            )
        )
      ),
      ...built(
        civilizationRegistry,
        clientRegistry,
        engine,
        new PlayerRegistry(),
        new PlayerWorldRegistry(),
        ruleRegistry,
        leaderRegistry,
        undefined,
        undefined,
        undefined,
        startTiles,
        playerResearchRegistry,
        new GameDifficultyRegistry(),
        terrainFeatureRegistry,
        () => 0.5
      ),
      ...spawn(ruleRegistry, startTiles),
      new PickStartTile(
        new Effect((pickFrom: World) => {
          const [x, y] = starts[seated++];

          return pickFrom.get(x, y);
        })
      )
    );

    // Every player is chosen as a Babylonian led by Hammurabi before seating, so seating asks nothing.
    players.forEach((player) => {
      const civilization = new Babylonian();

      civilization.setLeader(new Hammurabi());
      player.setCivilization(civilization);
    });

    await world.build();
    await started;

    // Alone on 180 squares: 3 (clamped), rivers 4, size 3 = 10. The other two, 5 apart: grassland 2, size 3 = 5.
    expect(world.landMasses()).length(2);
    expect(
      unitRegistry.getByPlayer(players[0]).map((unit) => unit.constructor)
    ).eql([Settlers]);
    players.slice(1).forEach((player) => {
      expect(
        unitRegistry.getByPlayer(player).map((unit) => unit.constructor)
      ).eql([Settlers, Settlers]);
      expect(playerResearchRegistry.getByPlayer(player).complete()).length(2);
    });
    expect(playerResearchRegistry.getByPlayer(players[0]).complete()).length(0);
  });

  it('refuses a start on none of the land masses', async (): Promise<void> => {
    const ruleRegistry = new RuleRegistry(),
      world = new World(
        new Generator(10, 10, () => new Ocean(ruleRegistry), {
          topologyId: 'staggered-iso',
        } as any),
        ruleRegistry,
        new LandMassRegistry()
      );

    await world.build();

    expect(() =>
      siteOf(world.get(4, 4), world, new TerrainFeatureRegistry())
    ).throw(StartNotOnLandError);
  });

  it('still starts the game, and reports why, when the balancing fails', async (): Promise<void> => {
    const ruleRegistry = new RuleRegistry(),
      clientRegistry = new ClientRegistry(),
      civilizationRegistry = new CivilizationRegistry(),
      leaderRegistry = new LeaderRegistry(),
      engine = new Engine(),
      startTiles = new StartTiles(),
      started: Promise<void> = new Promise((resolve) =>
        engine.on('game:start', resolve)
      ),
      world = new World(
        new Generator(10, 10, () => new Ocean(ruleRegistry), {
          topologyId: 'staggered-iso',
        } as any),
        ruleRegistry,
        new LandMassRegistry()
      ),
      player = new Player(ruleRegistry),
      civilization = new Babylonian(),
      reported: unknown[] = [],
      consoleError = console.error;

    civilization.setLeader(new Hammurabi());
    player.setCivilization(civilization);
    clientRegistry.register(new AIClient(player));

    ruleRegistry.register(
      ...built(
        civilizationRegistry,
        clientRegistry,
        engine,
        new PlayerRegistry(),
        new PlayerWorldRegistry(),
        ruleRegistry,
        leaderRegistry,
        undefined,
        undefined,
        undefined,
        startTiles,
        new PlayerResearchRegistry(),
        new GameDifficultyRegistry(),
        new TerrainFeatureRegistry(),
        () => 0.5
      ),
      ...spawn(ruleRegistry, startTiles),
      // An ocean square: no land mass, so the balancing throws.
      new PickStartTile(new Effect((pickFrom: World) => pickFrom.get(4, 4)))
    );

    console.error = (...args: unknown[]): void => {
      reported.push(...args);
    };

    try {
      await world.build();
      await started;
    } finally {
      console.error = consoleError;
    }

    expect(reported.some((item) => item instanceof StartNotOnLandError)).true;
  });

  it("picks a person's free advances as one with 1 advance counted, so no opening choice is hidden", async (): Promise<void> => {
    const ruleRegistry = new RuleRegistry(),
      terrainFeatureRegistry = new TerrainFeatureRegistry(),
      clientRegistry = new ClientRegistry(),
      playerResearchRegistry = new PlayerResearchRegistry(),
      advanceRegistry = new AdvanceRegistry(),
      world = new World(
        new Generator(20, 20, () => new Grassland(ruleRegistry), {
          topologyId: 'staggered-iso',
        } as any),
        ruleRegistry,
        new LandMassRegistry()
      );

    await world.build();

    advanceRegistry.register(...advances.map(([AdvanceType]) => AdvanceType));

    const rich = world.get(4, 4),
      poor = world.get(14, 14),
      computer = new Player(ruleRegistry),
      person = new Player(ruleRegistry);

    fatCross(rich)
      .entries()
      .forEach((tile: Tile) =>
        terrainFeatureRegistry.register(new River(tile.terrain()))
      );

    [computer, person].forEach((player) => {
      player.setCivilization(new Babylonian());
      playerResearchRegistry.register(
        new PlayerResearch(player, advanceRegistry, ruleRegistry)
      );
    });
    clientRegistry.register(new AIClient(computer), new Client(person));

    // C rand() results 0, 0, 2, 0, 0, 0, 0 in turn: a person scores rand() % 3 + value − 1. With nothing known and
    //  nobody knowing anything, the openings are worth Alphabet 6, Bronze Working 7, Ceremonial Burial 6, the rest 5.
    //  With 1 counted all 7 are offered and Ceremonial Burial scores 7, first ahead of Bronze Working's 6. Counted as
    //  0, Ceremonial Burial and Horseback Riding would be hidden and Bronze Working would win.
    const results = [0, 0, 2, 0, 0, 0, 0];
    let draw = 0;

    // The poor start is 2 short (8 against 6): 2 advances for the person.
    balanceStarts(
      [
        [computer, rich],
        [person, poor],
      ],
      world,
      {
        clientRegistry,
        gameDifficultyRegistry: new GameDifficultyRegistry(),
        playerResearchRegistry,
        ruleRegistry,
        terrainFeatureRegistry,
        randomNumberGenerator: () =>
          (results[draw++ % results.length] + 0.5) / 32768,
      }
    );

    const [first] = playerResearchRegistry.getByPlayer(person).complete();

    expect(playerResearchRegistry.getByPlayer(person).complete()).length(2);
    expect(first).instanceof(Advances.CeremonialBurial);
  });

  it('still starts the game, and reports why, when seating fails', async (): Promise<void> => {
    const ruleRegistry = new RuleRegistry(),
      clientRegistry = new ClientRegistry(),
      engine = new Engine(),
      started: Promise<void> = new Promise((resolve) =>
        engine.on('game:start', resolve)
      ),
      world = new World(
        new Generator(10, 10, () => new Grassland(ruleRegistry), {
          topologyId: 'staggered-iso',
        } as any),
        ruleRegistry,
        new LandMassRegistry()
      ),
      player = new Player(ruleRegistry),
      civilization = new Babylonian(),
      reported: unknown[] = [],
      consoleError = console.error;

    civilization.setLeader(new Hammurabi());
    player.setCivilization(civilization);
    clientRegistry.register(new AIClient(player));

    ruleRegistry.register(
      ...built(
        new CivilizationRegistry(),
        clientRegistry,
        engine,
        new PlayerRegistry(),
        new PlayerWorldRegistry(),
        ruleRegistry,
        new LeaderRegistry(),
        undefined,
        undefined,
        undefined,
        new StartTiles(),
        new PlayerResearchRegistry(),
        new GameDifficultyRegistry(),
        new TerrainFeatureRegistry(),
        () => 0.5
      ),
      // No start square at all.
      new PickStartTile(new Effect((): undefined => undefined))
    );

    console.error = (...args: unknown[]): void => {
      reported.push(...args);
    };

    try {
      await world.build();
      await started;
    } finally {
      console.error = consoleError;
    }

    expect(
      reported.some(
        (item) =>
          item instanceof TypeError &&
          /startingSquare/.test((item as Error).message)
      )
    ).true;
  });
});

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
import { advances } from '@civ-clone/civ2-science/data/advances';
import balanceStarts from '../lib/balanceStarts';
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
});

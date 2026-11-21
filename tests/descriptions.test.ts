import { CIVIL_WAR_CAPITAL_RULE, CIVIL_WAR_RULE } from '../RuleIds';
import City from '@civ-clone/core-city/City';
import CivilWar from '@civ-clone/base-civil-war/Rules/CivilWar';
import { EffectDescription } from '@civ-clone/core-rule/Description';
import { Game } from '@civ-clone/core-game';
import { Palace } from '@civ-clone/civ2-city-improvement/CityImprovements';
import Player from '@civ-clone/core-player/Player';
import { expect } from 'chai';
import civilWarRules from '../Rules/CivilWar/civilWar';

describe('descriptions', (): void => {
  const improvements: object[] = [],
    game = {
      cityImprovements: {
        getByCity: (): object[] => improvements,
      },
    } as unknown as Game,
    rules = civilWarRules(game),
    ruleById = (id: string) => rules.find((rule) => rule.id() === id)!,
    about = (subject: Function): EffectDescription[] =>
      rules
        .flatMap((rule) => rule.descriptions())
        .filter((description) => description.subject === subject);

  it('says something about the Palace', (): void => {
    expect(about(Palace)).not.empty;
  });

  it("describes the civil war on the capture rule, which needs the Palace's city", (): void => {
    expect(ruleById(CIVIL_WAR_RULE).descriptions()).eql([
      { type: 'civil_war', subject: Palace },
    ]);

    const city = Object.create(City.prototype) as City,
      player = Object.create(Player.prototype) as Player,
      capital = ruleById(CIVIL_WAR_CAPITAL_RULE) as CivilWar;

    expect(capital.process(city, player, player)).false;

    improvements.push(Object.create(Palace.prototype));

    expect(capital.process(city, player, player)).true;
  });
});

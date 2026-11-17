# civ2-player

Civilization II's player lifecycle, as rules on `base-player`'s mechanisms. It mirrors `civ1-player` rule for rule,
under `civ2-player:` ids.

- **Joining and seating:** once the world is built, each player gets its view of the world and is seated, one after
  another, on the square the world's `PickStartTile` rule picks. Then `game:start` is emitted.
- **Start units:** one Settlers (OpenCiv2 `civ.cpp` `civ_create_place_units`).
- **Turns:** the barbarians move first, then everyone else in the order they joined. At the start of a player's turn
  its cities' Food, Production and Trade are processed and its units reset. The end-turn action waits for every other
  mandatory action.
- **Sight:** units reveal the squares around them, and a tile improvement built, pillaged or removed updates every
  player who knows the square.
- **Defeat:** a computer player is out once it has no cities, and a person once they have no cities and no unit that
  founds cities. Barbarians are never defeated. A defeated player stops moving, leaves the game and loses its units.

- **Start balancing** (`lib/startBalance`, OpenCiv2 `game.cpp` `game_balance_start_positions`): once everyone is
  seated, each start is scored for room (the nearest start on its land mass, or the land mass's size when alone),
  rivers or Grassland among its 21 squares, and its land mass's size. A start more than 3 short of the best gets an
  extra Settlers (a person on Deity always does), and then an advance for each point it is still short, picked as the
  game picks research (`civ2-science`'s `pickResearch`), with every civilization still counting the 1 advance it is
  placed with. If the balancing fails (a start on no land mass), the error is logged and the game starts anyway.

- **Civil war** (`Rules/CivilWar/civilWar`, `lib/civilWar`, on `base-civil-war`; OpenCiv2 `city_capture_aftermath`
  :5441-5460, `civ_civil_war` :7393): a computer player with more than 4 cities (the one taken included) splits when
  its Palace city is taken by someone weaker: a person ranked below it by power, or, for a computer captor or the
  barbarians, when the weakest person ranks below it (always, with no person in the game). One `CivilWar` rule each
  (`RuleIds`). It runs first among the capture's rules, before civ2-city's plunder and civ2-city-improvement's Palace
  escape. The rebels take the cities `RebelCities` picks: walking the land masses, the capital's stays loyal and each
  other goes over unless the rebels already hold more; if the loyal side then holds at least as much but less than
  twice as much, those land masses go; otherwise the cities farthest from the capital (more than 1 away, by
  Civilization II's diagonal distance) go one by one until the rebels hold a third of the citizens. They get half the
  gold, the government, the research toward the loser's current advance, every square the loser has seen, a war with
  the loser (the loser the aggressor) and a last contact 8 turns ago with everyone; each side's Palace goes to its most
  central city (`civ_find_central_city`). The loser's spaceship is lost unless its Palace escapes after all. If no
  civilization is left for the rebels, the loser keeps everything, loses its ship, has no Palace escape
  (civ2-city-improvement's `barPalaceEscape`) and its most central city starts building a Palace.

Not here yet (civil war): Civilization II's seven civilization numbers. The original splits a civilization only into a
free number, one with no cities and no military units (a living one with only Settlers included, which the rebels
replace), and compares a computer captor through the rank of the civilization numbered as the weakest person's rank;
here a split can always add a player, and that rank is compared as a rank. The rebels' tribe isn't one of the free
number's colour, their attitudes aren't drawn afresh, and their science and tax rates are their own rule set's start.

Not here yet: the balancing's multiplayer-Deity Settlers; `advanceValue`'s unit, tribe and city terms (see
`civ2-science`); and the advances it gives count towards the advances gained, which Civ2 doesn't count before the
first turn.

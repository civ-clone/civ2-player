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
  game picks research (`civ2-science`'s `pickResearch`).

Not here yet: the balancing's multiplayer-Deity Settlers; `advanceValue`'s unit, tribe and city terms (see
`civ2-science`); and the advances it gives count towards the advances gained, which Civ2 doesn't count before the
first turn.

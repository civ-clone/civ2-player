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

Not here yet: Civ2's start balancing (`game.cpp` `game_balance_start_positions`), which gives civilizations with a
poorer start an extra Settlers or free advances. It needs Civ2's advances.

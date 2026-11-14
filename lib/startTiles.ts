import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';

/**
 * The square each player was seated on, in seating order, for the start balancing once everyone is seated. The
 * `Spawn` rule records it (units aren't registered anywhere a rule can ask before a unit package wires them), and the
 * balancing empties it.
 */
export class StartTiles {
  #starts: [Player, Tile][] = [];

  add(player: Player, tile: Tile): void {
    this.#starts.push([player, tile]);
  }

  take(): [Player, Tile][] {
    return this.#starts.splice(0);
  }
}

export const instance = new StartTiles();

export default StartTiles;

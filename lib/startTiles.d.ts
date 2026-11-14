import Player from '@civ-clone/core-player/Player';
import Tile from '@civ-clone/core-world/Tile';
/**
 * The square each player was seated on, in seating order, for the start balancing once everyone is seated. The
 * `Spawn` rule records it (units aren't registered anywhere a rule can ask before a unit package wires them), and the
 * balancing empties it.
 */
export declare class StartTiles {
  #private;
  add(player: Player, tile: Tile): void;
  take(): [Player, Tile][];
}
export declare const instance: StartTiles;
export default StartTiles;

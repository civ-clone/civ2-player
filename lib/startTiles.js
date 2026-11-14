"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _StartTiles_starts;
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = exports.StartTiles = void 0;
/**
 * The square each player was seated on, in seating order, for the start balancing once everyone is seated. The
 * `Spawn` rule records it (units aren't registered anywhere a rule can ask before a unit package wires them), and the
 * balancing empties it.
 */
class StartTiles {
    constructor() {
        _StartTiles_starts.set(this, []);
    }
    add(player, tile) {
        __classPrivateFieldGet(this, _StartTiles_starts, "f").push([player, tile]);
    }
    take() {
        return __classPrivateFieldGet(this, _StartTiles_starts, "f").splice(0);
    }
}
exports.StartTiles = StartTiles;
_StartTiles_starts = new WeakMap();
exports.instance = new StartTiles();
exports.default = StartTiles;
//# sourceMappingURL=startTiles.js.map
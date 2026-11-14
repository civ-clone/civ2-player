"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEvents = void 0;
const CurrentPlayerRegistry_1 = require("@civ-clone/core-player/CurrentPlayerRegistry");
const Engine_1 = require("@civ-clone/core-engine/Engine");
const PlayerRegistry_1 = require("@civ-clone/core-player/PlayerRegistry");
const turnOrder_1 = require("@civ-clone/base-player/lib/turnOrder");
const turns_1 = require("@civ-clone/base-player/lib/turns");
const getEvents = (playerRegistry = PlayerRegistry_1.instance, currentPlayerRegistry = CurrentPlayerRegistry_1.instance, engine = Engine_1.instance) => [
    [
        'turn:start',
        () => {
            // The barbarians move first, as Civ2's slot 0 does, then everyone else in the order they joined.
            (0, turns_1.startTurn)((0, turnOrder_1.default)(playerRegistry.entries()), currentPlayerRegistry, engine);
        },
    ],
];
exports.getEvents = getEvents;
exports.default = exports.getEvents;
//# sourceMappingURL=start.js.map
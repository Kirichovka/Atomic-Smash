import { DEFAULT_MECHANIC_ID } from "../state.js";
import { createConnectionLabMechanic } from "./connection-lab.js";

export function createMechanicsRegistry({ refs, state, bus }) {
    const mechanics = new Map([
        [DEFAULT_MECHANIC_ID, createConnectionLabMechanic({ refs, state, bus })]
    ]);

    function init() {
        mechanics.forEach(mechanic => {
            mechanic.init();
        });
    }

    function get(mechanicId = DEFAULT_MECHANIC_ID) {
        return mechanics.get(mechanicId) ?? mechanics.get(DEFAULT_MECHANIC_ID);
    }

    function resetAll() {
        mechanics.forEach(mechanic => {
            mechanic.reset();
        });
    }

    return {
        get,
        init,
        resetAll
    };
}

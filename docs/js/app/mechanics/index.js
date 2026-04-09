import { DEFAULT_MECHANIC_ID } from "../state.js";
import { createConnectionLabMechanic } from "./connection-lab.js";

export function createMechanicsRegistry({ refs, state, bus }) {
    const mechanicFactories = {
        "connection-lab": createConnectionLabMechanic
    };
    const mechanics = new Map();

    registerConfiguredMechanics();
    ensureDefaultMechanic();

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

    function registerConfiguredMechanics() {
        const configuredMechanics = Array.isArray(state.catalog.mechanics)
            ? state.catalog.mechanics
            : [];

        configuredMechanics.forEach(mechanicConfig => {
            const createMechanic = mechanicFactories[mechanicConfig.id];
            if (!createMechanic || mechanics.has(mechanicConfig.id)) {
                return;
            }

            mechanics.set(mechanicConfig.id, createMechanic({ refs, state, bus }));
        });
    }

    function ensureDefaultMechanic() {
        if (mechanics.has(DEFAULT_MECHANIC_ID)) {
            return;
        }

        mechanics.set(DEFAULT_MECHANIC_ID, createConnectionLabMechanic({ refs, state, bus }));
    }

    return {
        get,
        init,
        resetAll
    };
}

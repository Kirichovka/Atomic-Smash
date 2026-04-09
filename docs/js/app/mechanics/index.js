import { DEFAULT_MECHANIC_ID } from "../state.js";
import { createConnectionLabMechanic } from "./connection-lab.js";
import { createMechanicInstance } from "./factory.js";

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
            if (!mechanicConfig?.id || mechanics.has(mechanicConfig.id)) {
                return;
            }

            const createMechanic = mechanicFactories[mechanicConfig.id];
            if (!createMechanic) {
                return;
            }

            const mechanic = createMechanicInstance({
                config: mechanicConfig,
                context: { refs, state, bus },
                factory: createMechanic
            });
            mechanics.set(mechanicConfig.id, mechanic);
        });
    }

    function ensureDefaultMechanic() {
        if (mechanics.has(DEFAULT_MECHANIC_ID)) {
            return;
        }

        mechanics.set(
            DEFAULT_MECHANIC_ID,
            createMechanicInstance({
                config: {
                    id: DEFAULT_MECHANIC_ID,
                    name: "Connection Lab"
                },
                context: { refs, state, bus },
                factory: createConnectionLabMechanic
            })
        );
    }

    return {
        get,
        init,
        resetAll
    };
}

import { DEFAULT_MECHANIC_ID } from "../state.js";
import { createConnectionLabMechanic } from "./connection-lab.js";
import { createMechanicInstance } from "./factory.js";

export function createMechanicsRegistry({ refs, state, bus, boardRuntimeSchemaConfig }) {
    const mechanicFactories = {
        "connection-lab": createConnectionLabMechanic
    };
    const mechanics = new Map();
    let activeMechanicId = null;

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

    function syncActiveMechanic(nextMechanicId = DEFAULT_MECHANIC_ID, lifecycleContext = {}) {
        const resolvedNextMechanic = get(nextMechanicId);
        const resolvedNextMechanicId = resolvedNextMechanic?.id ?? DEFAULT_MECHANIC_ID;

        if (activeMechanicId && activeMechanicId !== resolvedNextMechanicId) {
            get(activeMechanicId)?.deactivate?.({
                nextMechanicId: resolvedNextMechanicId,
                ...lifecycleContext
            });
        }

        activeMechanicId = resolvedNextMechanicId;
        resolvedNextMechanic?.activate?.({
            activeMechanicId: resolvedNextMechanicId,
            ...lifecycleContext
        });
        return resolvedNextMechanic;
    }

    function deactivateActiveMechanic(lifecycleContext = {}) {
        if (!activeMechanicId) {
            return;
        }

        get(activeMechanicId)?.deactivate?.(lifecycleContext);
        activeMechanicId = null;
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
                context: { refs, state, bus, boardRuntimeSchemaConfig },
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
                context: { refs, state, bus, boardRuntimeSchemaConfig },
                factory: createConnectionLabMechanic
            })
        );
    }

    return {
        get,
        init,
        deactivateActiveMechanic,
        resetAll,
        syncActiveMechanic
    };
}

import { DEFAULT_MECHANIC_ID } from "../state.js";
import { createMechanicAdapter } from "./adapters.js";
import { createMechanicInstance } from "./factory.js";
import { createBuiltInMechanicManifests } from "./manifests.js";

export function createMechanicsRegistry({ refs, state, bus, boardRuntimeSchemaConfig }) {
    const mechanicAdapters = new Map(
        createBuiltInMechanicManifests().map(manifest => [
            manifest.id,
            createMechanicAdapter({
                manifest,
                context: { refs, state, bus, boardRuntimeSchemaConfig }
            })
        ])
    );
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

    function getManifest(mechanicId = DEFAULT_MECHANIC_ID) {
        return mechanicAdapters.get(mechanicId)?.manifest ?? mechanicAdapters.get(DEFAULT_MECHANIC_ID)?.manifest ?? null;
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

            const mechanicAdapter = mechanicAdapters.get(mechanicConfig.id);
            if (!mechanicAdapter) {
                return;
            }

            const mechanic = createMechanicInstance({
                config: {
                    ...mechanicConfig,
                    capabilities: mechanicAdapter.manifest.capabilities,
                    manifestId: mechanicAdapter.manifest.id
                },
                context: { refs, state, bus, boardRuntimeSchemaConfig, mechanicManifest: mechanicAdapter.manifest },
                factory: context => mechanicAdapter.createInstance(mechanicConfig, context)
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
                    capabilities: mechanicAdapters.get(DEFAULT_MECHANIC_ID)?.manifest?.capabilities ?? [],
                    id: DEFAULT_MECHANIC_ID,
                    manifestId: mechanicAdapters.get(DEFAULT_MECHANIC_ID)?.manifest?.id ?? DEFAULT_MECHANIC_ID,
                    name: "Connection Lab"
                },
                context: {
                    refs,
                    state,
                    bus,
                    boardRuntimeSchemaConfig,
                    mechanicManifest: mechanicAdapters.get(DEFAULT_MECHANIC_ID)?.manifest ?? null
                },
                factory: context => mechanicAdapters.get(DEFAULT_MECHANIC_ID).createInstance({
                    id: DEFAULT_MECHANIC_ID,
                    name: "Connection Lab"
                }, context)
            })
        );
    }

    return {
        get,
        getManifest,
        init,
        deactivateActiveMechanic,
        resetAll,
        syncActiveMechanic
    };
}

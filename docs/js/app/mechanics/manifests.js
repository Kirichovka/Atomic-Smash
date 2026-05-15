import { createConnectionLabMechanic } from "./connection-lab/index.js?v=20260515-balance-flow";
import { createBalanceLabMechanic } from "./balance-lab/index.js?v=20260515-balance-journal-persist";
import { createMechanicManifest } from "./manifest-factory.js";
import { MECHANIC_CAPABILITY } from "./manifest-contracts.js";

export function createBuiltInMechanicManifests() {
    return [
        createMechanicManifest({
            id: "connection-lab",
            capabilities: [
                MECHANIC_CAPABILITY.activationLifecycle,
                MECHANIC_CAPABILITY.boardSceneRuntime,
                MECHANIC_CAPABILITY.helpVisual,
                MECHANIC_CAPABILITY.selection,
                MECHANIC_CAPABILITY.spawnAtPoint,
                MECHANIC_CAPABILITY.valencyValidation
            ],
            create: createConnectionLabMechanic
        }),
        createMechanicManifest({
            id: "balance-lab",
            capabilities: [
                MECHANIC_CAPABILITY.activationLifecycle,
                MECHANIC_CAPABILITY.helpVisual
            ],
            create: createBalanceLabMechanic
        })
    ];
}

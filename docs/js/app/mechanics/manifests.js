import { createConnectionLabMechanic } from "./connection-lab.js";
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
        })
    ];
}

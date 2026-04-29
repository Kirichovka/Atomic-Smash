import { assertMechanicManifestContract, attachMechanicManifestMetadata } from "./manifest-contracts.js";

export function createMechanicManifest(manifest) {
    return attachMechanicManifestMetadata(
        assertMechanicManifestContract(manifest)
    );
}

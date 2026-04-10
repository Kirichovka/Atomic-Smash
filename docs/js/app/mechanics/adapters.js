export function createMechanicAdapter({
    manifest,
    context
}) {
    return {
        createInstance(config, runtimeContext = {}) {
            return manifest.create({
                ...context,
                ...runtimeContext,
                mechanicConfig: config,
                mechanicManifest: manifest
            });
        },
        hasCapability(capability) {
            return manifest.capabilities.includes(capability);
        },
        id: manifest.id,
        manifest
    };
}

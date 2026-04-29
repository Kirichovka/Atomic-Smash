export const SCENE_SCHEMA_CONFIG_KIND = "atomic-smash.scene-ui-config";
export const SCENE_SCHEMA_CONFIG_VERSION = 1;

export function createSceneSchemaConfigEnvelope(definitions) {
    return {
        definitions,
        kind: SCENE_SCHEMA_CONFIG_KIND,
        version: SCENE_SCHEMA_CONFIG_VERSION
    };
}

export function isSceneSchemaConfigEnvelope(config) {
    return Boolean(config)
        && typeof config === "object"
        && !Array.isArray(config)
        && config.kind === SCENE_SCHEMA_CONFIG_KIND
        && config.version === SCENE_SCHEMA_CONFIG_VERSION
        && config.definitions
        && typeof config.definitions === "object"
        && !Array.isArray(config.definitions);
}


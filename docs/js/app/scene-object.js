export const SCENE_OBJECT_ROLE = Object.freeze({
    entity: "entity",
    ui: "ui",
    view: "view"
});

export class SceneObject {
    constructor({
        id = null,
        kind = "object",
        role = SCENE_OBJECT_ROLE.entity,
        children = [],
        classes = [],
        metadata = {}
    } = {}) {
        this.id = id;
        this.kind = kind;
        this.role = role;
        this.children = children;
        this.classes = classes;
        this.metadata = metadata;
    }
}

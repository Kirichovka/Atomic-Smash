import { SceneObject, SCENE_OBJECT_ROLE } from "../scene-object.js";
import { assertSceneUiElementContract, SCENE_UI_DEFAULT_TAGS, SCENE_UI_ELEMENT_KIND } from "./contracts.js";

export class SceneUiElement extends SceneObject {
    constructor({
        attributes = {},
        children = [],
        classNames = [],
        dataset = {},
        id = null,
        kind,
        layoutRules = [],
        styles = {},
        tagName = null,
        textContent = "",
        listeners = []
    }) {
        assertSceneUiElementContract({
            children,
            kind,
            listeners,
            tagName: tagName ?? SCENE_UI_DEFAULT_TAGS[kind],
            textContent
        });

        super({
            id,
            kind,
            role: SCENE_OBJECT_ROLE.ui,
            children,
            classes: classNames,
            metadata: {
                tagName: tagName ?? SCENE_UI_DEFAULT_TAGS[kind]
            }
        });

        this.attributes = attributes;
        this.classNames = classNames;
        this.dataset = dataset;
        this.layoutRules = layoutRules;
        this.styles = styles;
        this.tagName = tagName ?? SCENE_UI_DEFAULT_TAGS[kind];
        this.textContent = textContent;
        this.listeners = listeners;
    }
}

export class SceneUiContainer extends SceneUiElement {
    constructor(options = {}) {
        super({
            ...options,
            kind: SCENE_UI_ELEMENT_KIND.container
        });
    }
}

export class SceneUiText extends SceneUiElement {
    constructor(options = {}) {
        super({
            ...options,
            kind: SCENE_UI_ELEMENT_KIND.text
        });
    }
}

export class SceneUiButton extends SceneUiElement {
    constructor(options = {}) {
        super({
            attributes: {
                type: "button",
                ...(options.attributes ?? {})
            },
            ...options,
            kind: SCENE_UI_ELEMENT_KIND.button
        });
    }
}

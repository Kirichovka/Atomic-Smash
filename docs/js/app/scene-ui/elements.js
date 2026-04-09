import { SCENE_UI_DEFAULT_TAGS, SCENE_UI_ELEMENT_KIND } from "./contracts.js";

export class SceneUiElement {
    constructor({
        attributes = {},
        children = [],
        classNames = [],
        dataset = {},
        id = null,
        kind,
        styles = {},
        tagName = null,
        textContent = "",
        listeners = []
    }) {
        this.attributes = attributes;
        this.children = children;
        this.classNames = classNames;
        this.dataset = dataset;
        this.id = id;
        this.kind = kind;
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

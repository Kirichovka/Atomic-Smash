export const SCENE_UI_ELEMENT_KIND = Object.freeze({
    button: "button",
    container: "container",
    text: "text"
});

export const SCENE_UI_DEFAULT_TAGS = Object.freeze({
    button: "button",
    container: "div",
    text: "span"
});

export const SCENE_UI_ELEMENT_SPEC = Object.freeze({
    [SCENE_UI_ELEMENT_KIND.button]: Object.freeze({
        allowsChildren: true,
        allowsListeners: true,
        allowsTextContent: true,
        defaultTag: SCENE_UI_DEFAULT_TAGS.button,
        kind: SCENE_UI_ELEMENT_KIND.button,
        supportedTagNames: ["button"]
    }),
    [SCENE_UI_ELEMENT_KIND.container]: Object.freeze({
        allowsChildren: true,
        allowsListeners: true,
        allowsTextContent: true,
        defaultTag: SCENE_UI_DEFAULT_TAGS.container,
        kind: SCENE_UI_ELEMENT_KIND.container,
        supportedTagNames: null
    }),
    [SCENE_UI_ELEMENT_KIND.text]: Object.freeze({
        allowsChildren: false,
        allowsListeners: false,
        allowsTextContent: true,
        defaultTag: SCENE_UI_DEFAULT_TAGS.text,
        kind: SCENE_UI_ELEMENT_KIND.text,
        supportedTagNames: ["div", "em", "h1", "h2", "h3", "h4", "h5", "h6", "label", "p", "small", "span", "strong"]
    })
});

export function getSceneUiElementSpec(kind) {
    const spec = SCENE_UI_ELEMENT_SPEC[kind];
    if (!spec) {
        throw new Error(`Unknown scene-ui element kind: ${String(kind)}`);
    }

    return spec;
}

export function assertSceneUiElementContract({
    children = [],
    kind,
    listeners = [],
    tagName = null,
    textContent = ""
}) {
    const spec = getSceneUiElementSpec(kind);
    const effectiveTagName = tagName ?? spec.defaultTag;

    if (!spec.allowsChildren && Array.isArray(children) && children.length > 0) {
        throw new Error(`Scene-ui ${kind} does not support child elements.`);
    }

    if (!spec.allowsListeners && Array.isArray(listeners) && listeners.length > 0) {
        throw new Error(`Scene-ui ${kind} does not support event listeners.`);
    }

    if (!spec.allowsTextContent && typeof textContent === "string" && textContent.length > 0) {
        throw new Error(`Scene-ui ${kind} does not support text content.`);
    }

    if (Array.isArray(spec.supportedTagNames) && !spec.supportedTagNames.includes(effectiveTagName)) {
        throw new Error(
            `Scene-ui ${kind} does not support tag "${effectiveTagName}". ` +
            `Supported tags: ${spec.supportedTagNames.join(", ")}.`
        );
    }

    return spec;
}

import { SceneUiButton, SceneUiContainer, SceneUiText } from "./elements.js";

class SceneUiBuilder {
    constructor() {
        this.definition = {
            attributes: {},
            children: [],
            classNames: [],
            dataset: {},
            listeners: [],
            styles: {}
        };
    }

    id(value) {
        this.definition.id = value;
        return this;
    }

    className(...classNames) {
        this.definition.classNames.push(...classNames.filter(Boolean));
        return this;
    }

    attr(name, value) {
        this.definition.attributes[name] = value;
        return this;
    }

    data(name, value) {
        this.definition.dataset[name] = value;
        return this;
    }

    style(name, value) {
        this.definition.styles[name] = value;
        return this;
    }

    styles(styleMap = {}) {
        Object.assign(this.definition.styles, styleMap);
        return this;
    }

    layout({
        alignItems,
        display,
        flexDirection,
        gap,
        height,
        inset,
        justifyContent,
        left,
        padding,
        position,
        top,
        width
    } = {}) {
        return this.styles({
            ...(alignItems ? { alignItems } : {}),
            ...(display ? { display } : {}),
            ...(flexDirection ? { flexDirection } : {}),
            ...(gap !== undefined ? { gap } : {}),
            ...(height !== undefined ? { height } : {}),
            ...(inset !== undefined ? { inset } : {}),
            ...(justifyContent ? { justifyContent } : {}),
            ...(left !== undefined ? { left } : {}),
            ...(padding !== undefined ? { padding } : {}),
            ...(position ? { position } : {}),
            ...(top !== undefined ? { top } : {}),
            ...(width !== undefined ? { width } : {})
        });
    }

    child(child) {
        this.definition.children.push(child);
        return this;
    }

    children(children) {
        this.definition.children.push(...children);
        return this;
    }

    on(eventName, handler) {
        this.definition.listeners.push({ eventName, handler });
        return this;
    }
}

export class SceneContainerBuilder extends SceneUiBuilder {
    build() {
        return new SceneUiContainer(this.definition);
    }
}

export class SceneTextBuilder extends SceneUiBuilder {
    text(value) {
        this.definition.textContent = value;
        return this;
    }

    tagName(value) {
        this.definition.tagName = value;
        return this;
    }

    build() {
        return new SceneUiText(this.definition);
    }
}

export class SceneButtonBuilder extends SceneUiBuilder {
    label(value) {
        this.definition.textContent = value;
        return this;
    }

    disabled(value = true) {
        this.definition.attributes.disabled = value;
        return this;
    }

    build() {
        return new SceneUiButton(this.definition);
    }
}

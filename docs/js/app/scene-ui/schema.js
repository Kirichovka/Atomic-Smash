import { createInlineLayoutRule } from "./layout-rules.js";
import { SceneUiButton, SceneUiContainer, SceneUiText } from "./elements.js";
import { validateSceneSchemaDefinition } from "./validator.js";
import { assertKnownActionId } from "../contracts/action-ids.js";

export function sceneContainer(definition = {}) {
    return {
        ...definition,
        kind: "container"
    };
}

export function sceneText(definition = {}) {
    return {
        ...definition,
        kind: "text"
    };
}

export function sceneButton(definition = {}) {
    return {
        ...definition,
        kind: "button"
    };
}

export function sceneStack({
    align = "stretch",
    children = [],
    className,
    classNames,
    direction = "row",
    gap = 0,
    justify = "flex-start",
    styles = {},
    wrap = null,
    ...definition
} = {}) {
    return sceneContainer({
        ...definition,
        children,
        className,
        classNames,
        layout: {
            alignItems: align,
            display: "flex",
            flexDirection: direction,
            gap,
            justifyContent: justify
        },
        styles: {
            ...styles,
            ...(wrap ? { flexWrap: wrap } : {})
        }
    });
}

export function compileSceneSchema(definition) {
    if (!definition || typeof definition !== "object") {
        throw new Error("Scene schema definition must be an object.");
    }

    validateSceneSchemaDefinition(definition, "scene-definition");

    const options = {
        attributes: {
            ...(definition.attrs ?? {}),
            ...(definition.attributes ?? {})
        },
        children: normalizeChildren(definition.children),
        classNames: normalizeClassNames(definition.className, definition.classNames),
        dataset: {
            ...(definition.data ?? {}),
            ...(definition.dataset ?? {})
        },
        id: definition.id ?? null,
        layoutRules: normalizeLayoutRules(definition.layout),
        listeners: normalizeListeners(definition.on, definition.listeners),
        styles: {
            ...(definition.styles ?? {})
        },
        tagName: definition.tagName ?? null,
        textContent: definition.text ?? definition.textContent ?? ""
    };

    switch (definition.kind) {
        case "button":
            return new SceneUiButton(options);
        case "text":
            return new SceneUiText(options);
        case "container":
        default:
            return new SceneUiContainer(options);
    }
}

export function resolveSceneSchema(definition, bindings = {}, actionSource = {}) {
    return resolveSchemaValue(definition, bindings, actionSource);
}

function normalizeChildren(children = []) {
    return children
        .filter(Boolean)
        .map(child => compileSceneSchema(child));
}

function normalizeClassNames(className, classNames) {
    const normalized = [];

    if (typeof className === "string" && className.trim()) {
        normalized.push(...className.trim().split(/\s+/));
    }

    if (Array.isArray(classNames)) {
        normalized.push(...classNames.filter(Boolean));
    }

    return normalized;
}

function normalizeListeners(on = null, listeners = []) {
    const normalized = [];

    if (on && typeof on === "object") {
        Object.entries(on).forEach(([eventName, handler]) => {
            normalized.push({ eventName, handler });
        });
    }

    if (Array.isArray(listeners)) {
        normalized.push(...listeners.filter(listener => listener?.eventName));
    }

    return normalized;
}

function normalizeLayoutRules(layout = {}) {
    if (!layout || typeof layout !== "object") {
        return [];
    }

    if (typeof layout.kind === "string") {
        return [layout];
    }

    return [createInlineLayoutRule(layout)];
}

function resolveSchemaValue(value, bindings, actionSource) {
    if (Array.isArray(value)) {
        return value
            .map(item => resolveSchemaValue(item, bindings, actionSource))
            .filter(item => item !== undefined);
    }

    if (!value || typeof value !== "object") {
        return value;
    }

    if (isActionToken(value)) {
        return resolveActionToken(value, actionSource);
    }

    if (isBindingToken(value)) {
        const resolved = readBinding(bindings, value.bind);
        const bindingValue = resolved ?? value.fallback;

        if (isActionToken(bindingValue)) {
            return resolveActionToken(bindingValue, actionSource);
        }

        return bindingValue;
    }

    const resolvedObject = {};

    Object.entries(value).forEach(([key, entryValue]) => {
        if (key === "on" || key === "listeners") {
            resolvedObject[key] = resolveSchemaValue(entryValue, bindings, actionSource);
            return;
        }

        const resolvedEntry = resolveSchemaValue(entryValue, bindings, actionSource);
        if (resolvedEntry !== undefined) {
            resolvedObject[key] = resolvedEntry;
        }
    });

    return resolvedObject;
}

function isBindingToken(value) {
    return typeof value?.bind === "string";
}

function isActionToken(value) {
    return typeof value?.action === "string";
}

function readBinding(bindings, path) {
    return path.split(".").reduce((current, segment) => {
        if (current === null || current === undefined) {
            return undefined;
        }

        return current[segment];
    }, bindings);
}

function resolveActionToken(token, actionSource) {
    assertKnownActionId(token.action, "scene schema action");

    if (actionSource?.resolve && typeof actionSource.resolve === "function") {
        return actionSource.resolve(token.action, token.args);
    }

    const handler = actionSource?.[token.action];
    if (typeof handler !== "function") {
        throw new Error(`No handler available for scene schema action: ${token.action}`);
    }

    if (token.args === undefined) {
        return handler;
    }

    return event => handler(token.args, event);
}

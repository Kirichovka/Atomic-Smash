const VALID_KINDS = new Set(["button", "container", "text"]);
const VALID_LAYOUT_KEYS = new Set([
    "alignItems",
    "display",
    "flexDirection",
    "gap",
    "height",
    "inset",
    "justifyContent",
    "left",
    "padding",
    "position",
    "top",
    "width"
]);
const VALID_LAYOUT_RULE_KINDS = new Set(["inline", "stack"]);

export function validateSceneSchemaConfig(config, label = "scene-schema") {
    const errors = [];
    validatePlainObject(config, label, errors);

    if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw createSceneSchemaValidationError(label, errors);
    }

    Object.entries(config).forEach(([key, definition]) => {
        validateSceneSchemaDefinition(definition, `${label}.${key}`, errors);
    });

    if (errors.length > 0) {
        throw createSceneSchemaValidationError(label, errors);
    }

    return config;
}

export function validateSceneSchemaDefinition(definition, path = "scene-schema") {
    const errors = [];
    validateSceneNode(definition, path, errors);

    if (errors.length > 0) {
        throw createSceneSchemaValidationError(path, errors);
    }

    return definition;
}

function validateSceneNode(node, path, errors) {
    if (!isPlainObject(node)) {
        errors.push(`${path} must be an object.`);
        return;
    }

    if (!VALID_KINDS.has(node.kind)) {
        errors.push(`${path}.kind must be one of: button, container, text.`);
    }

    validateOptionalString(node.id, `${path}.id`, errors);
    validateOptionalString(node.className, `${path}.className`, errors);
    validateOptionalString(node.tagName, `${path}.tagName`, errors);
    validateOptionalString(node.text, `${path}.text`, errors, { allowToken: true });
    validateOptionalString(node.textContent, `${path}.textContent`, errors, { allowToken: true });

    validateStringArray(node.classNames, `${path}.classNames`, errors, { allowTokens: true });
    validateRecord(node.attrs, `${path}.attrs`, errors, { allowTokens: true, allowActions: false });
    validateRecord(node.attributes, `${path}.attributes`, errors, { allowTokens: true, allowActions: false });
    validateRecord(node.data, `${path}.data`, errors, { allowTokens: true, allowActions: false });
    validateRecord(node.dataset, `${path}.dataset`, errors, { allowTokens: true, allowActions: false });
    validateRecord(node.styles, `${path}.styles`, errors, { allowTokens: true, allowActions: false });
    validateListeners(node.on, `${path}.on`, errors);
    validateListenersArray(node.listeners, `${path}.listeners`, errors);
    validateLayout(node.layout, `${path}.layout`, errors);

    if (node.children !== undefined) {
        if (!Array.isArray(node.children)) {
            errors.push(`${path}.children must be an array.`);
        } else {
            node.children.forEach((child, index) => {
                validateSceneNode(child, `${path}.children[${index}]`, errors);
            });
        }
    }
}

function validateLayout(layout, path, errors) {
    if (layout === undefined) {
        return;
    }

    if (!isPlainObject(layout)) {
        errors.push(`${path} must be an object.`);
        return;
    }

    if (typeof layout.kind === "string") {
        validateLayoutRule(layout, path, errors);
        return;
    }

    Object.entries(layout).forEach(([key, value]) => {
        if (!VALID_LAYOUT_KEYS.has(key)) {
            errors.push(`${path}.${key} is not a supported layout key.`);
            return;
        }

        if (!isPrimitiveLayoutValue(value) && !isBindingToken(value)) {
            errors.push(`${path}.${key} must be a string, number, or bind token.`);
        }
    });
}

function validateLayoutRule(layout, path, errors) {
    if (!VALID_LAYOUT_RULE_KINDS.has(layout.kind)) {
        errors.push(`${path}.kind must be one of: inline, stack.`);
        return;
    }

    if (layout.kind === "inline") {
        if (!isPlainObject(layout.styles)) {
            errors.push(`${path}.styles must be an object for inline layout rules.`);
            return;
        }

        Object.entries(layout.styles).forEach(([key, value]) => {
            if (!VALID_LAYOUT_KEYS.has(key)) {
                errors.push(`${path}.styles.${key} is not a supported layout key.`);
                return;
            }

            if (!isPrimitiveLayoutValue(value) && !isBindingToken(value)) {
                errors.push(`${path}.styles.${key} must be a string, number, or bind token.`);
            }
        });
        return;
    }

    const allowedStackKeys = new Set(["align", "direction", "gap", "justify", "kind", "wrap"]);
    Object.entries(layout).forEach(([key, value]) => {
        if (!allowedStackKeys.has(key)) {
            errors.push(`${path}.${key} is not supported for stack layout rules.`);
            return;
        }

        if (key !== "kind" && !isPrimitiveLayoutValue(value) && !isBindingToken(value) && value !== null) {
            errors.push(`${path}.${key} must be a string, number, null, or bind token.`);
        }
    });
}

function validateListeners(listeners, path, errors) {
    if (listeners === undefined) {
        return;
    }

    if (!isPlainObject(listeners)) {
        errors.push(`${path} must be an object of event handlers or action tokens.`);
        return;
    }

    Object.entries(listeners).forEach(([eventName, handler]) => {
        if (!eventName.trim()) {
            errors.push(`${path} contains an empty event name.`);
            return;
        }

        if (!(typeof handler === "function" || isActionToken(handler))) {
            errors.push(`${path}.${eventName} must be a function or action token.`);
        }
    });
}

function validateListenersArray(listeners, path, errors) {
    if (listeners === undefined) {
        return;
    }

    if (!Array.isArray(listeners)) {
        errors.push(`${path} must be an array.`);
        return;
    }

    listeners.forEach((listener, index) => {
        if (!isPlainObject(listener)) {
            errors.push(`${path}[${index}] must be an object.`);
            return;
        }

        validateOptionalString(listener.eventName, `${path}[${index}].eventName`, errors);

        if (!(typeof listener.handler === "function" || isActionToken(listener.handler))) {
            errors.push(`${path}[${index}].handler must be a function or action token.`);
        }
    });
}

function validateRecord(record, path, errors, { allowTokens, allowActions }) {
    if (record === undefined) {
        return;
    }

    if (!isPlainObject(record)) {
        errors.push(`${path} must be an object.`);
        return;
    }

    Object.entries(record).forEach(([key, value]) => {
        if (!key.trim()) {
            errors.push(`${path} contains an empty key.`);
            return;
        }

        const isAllowedToken =
            (allowTokens && isBindingToken(value))
            || (allowActions && isActionToken(value));

        if (!isAllowedToken && !isPrimitiveRecordValue(value)) {
            errors.push(`${path}.${key} must be a primitive value${allowTokens ? ", bind token" : ""}.`);
        }
    });
}

function validateStringArray(value, path, errors, { allowTokens = false } = {}) {
    if (value === undefined) {
        return;
    }

    if (!Array.isArray(value)) {
        errors.push(`${path} must be an array.`);
        return;
    }

    value.forEach((item, index) => {
        const isValid = typeof item === "string" || (allowTokens && isBindingToken(item));
        if (!isValid) {
            errors.push(`${path}[${index}] must be a string${allowTokens ? " or bind token" : ""}.`);
        }
    });
}

function validateOptionalString(value, path, errors, { allowToken = false } = {}) {
    if (value === undefined || value === null) {
        return;
    }

    if (typeof value === "string") {
        return;
    }

    if (allowToken && isBindingToken(value)) {
        return;
    }

    errors.push(`${path} must be a string${allowToken ? " or bind token" : ""}.`);
}

function validatePlainObject(value, path, errors) {
    if (!isPlainObject(value)) {
        errors.push(`${path} must be a plain object.`);
    }
}

function createSceneSchemaValidationError(label, errors) {
    const error = new Error(
        `Invalid ${label}:\n- ${errors.join("\n- ")}`
    );
    error.name = "SceneSchemaValidationError";
    error.validationErrors = errors;
    return error;
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBindingToken(value) {
    return typeof value?.bind === "string";
}

function isActionToken(value) {
    return typeof value?.action === "string";
}

function isPrimitiveLayoutValue(value) {
    return typeof value === "string" || typeof value === "number";
}

function isPrimitiveRecordValue(value) {
    return (
        typeof value === "string"
        || typeof value === "number"
        || typeof value === "boolean"
        || value === null
    );
}

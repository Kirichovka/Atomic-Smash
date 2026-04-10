export const RUNTIME_EVENT_IDS = Object.freeze({
    elementDropAtPoint: "element:drop-at-point",
    elementQuickAdd: "element:quick-add",
    interactionContextChanged: "interaction:context-changed"
});

const EVENT_IDS = new Set(Object.values(RUNTIME_EVENT_IDS));

export function assertKnownRuntimeEventId(eventId) {
    if (!EVENT_IDS.has(eventId)) {
        throw new Error(`Unknown runtime event id: ${String(eventId)}`);
    }

    return eventId;
}

export function validateRuntimeEventPayload(eventId, payload = {}) {
    assertKnownRuntimeEventId(eventId);

    switch (eventId) {
        case RUNTIME_EVENT_IDS.interactionContextChanged:
            validateInteractionContextPayload(payload);
            break;
        case RUNTIME_EVENT_IDS.elementQuickAdd:
            validateQuickAddPayload(payload);
            break;
        case RUNTIME_EVENT_IDS.elementDropAtPoint:
            validateDropAtPointPayload(payload);
            break;
        default:
            break;
    }

    return payload;
}

function validateInteractionContextPayload(payload) {
    assertPlainObject(payload, "interaction context payload");
    assertOptionalString(payload.source, "interaction context payload.source");
    assertOptionalString(payload.zone, "interaction context payload.zone");
    assertOptionalBoolean(payload.clearBoardSelection, "interaction context payload.clearBoardSelection");
    assertOptionalBoolean(payload.clearPaletteSelection, "interaction context payload.clearPaletteSelection");
    assertOptionalNullableString(payload.inspectedSymbol, "interaction context payload.inspectedSymbol");
    assertOptionalNullableString(payload.paletteSymbol, "interaction context payload.paletteSymbol");
    assertOptionalBoolean(payload.persist, "interaction context payload.persist");
}

function validateQuickAddPayload(payload) {
    assertPlainObject(payload, "quick add payload");
    assertRequiredString(payload.symbol, "quick add payload.symbol");
    assertOptionalString(payload.source, "quick add payload.source");
}

function validateDropAtPointPayload(payload) {
    assertPlainObject(payload, "drop-at-point payload");
    assertRequiredString(payload.symbol, "drop-at-point payload.symbol");
    assertRequiredNumber(payload.clientX, "drop-at-point payload.clientX");
    assertRequiredNumber(payload.clientY, "drop-at-point payload.clientY");
}

function assertPlainObject(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${label} must be a plain object.`);
    }
}

function assertRequiredString(value, label) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${label} must be a non-empty string.`);
    }
}

function assertOptionalString(value, label) {
    if (value === undefined) {
        return;
    }

    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${label} must be a non-empty string when provided.`);
    }
}

function assertOptionalNullableString(value, label) {
    if (value === undefined || value === null) {
        return;
    }

    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${label} must be null or a non-empty string when provided.`);
    }
}

function assertOptionalBoolean(value, label) {
    if (value === undefined) {
        return;
    }

    if (typeof value !== "boolean") {
        throw new Error(`${label} must be a boolean when provided.`);
    }
}

function assertRequiredNumber(value, label) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        throw new Error(`${label} must be a valid number.`);
    }
}


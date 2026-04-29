import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";

export function createMixZoneContextRuntimeContentBuilder() {
    return {
        renderMixZoneContextActions,
        renderMixZonePickerOptions
    };
}

function renderMixZoneContextActions({
    actions,
    activeIndex,
    container,
    menuLabel,
    schemaConfig
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();
    if (menuLabel) {
        container.setAttribute("aria-label", menuLabel);
    }

    const fragment = document.createDocumentFragment();
    actions.forEach((action, index) => {
        fragment.appendChild(
            createSchemaElement(schemaConfig?.contextAction, {
                action: {
                    className: buildActionClassName(index === activeIndex),
                    id: action.id,
                    label: action.label
                }
            })
        );
    });

    container.appendChild(fragment);
}

function renderMixZonePickerOptions({
    activeIndex,
    container,
    elements,
    schemaConfig
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    const fragment = document.createDocumentFragment();
    elements.forEach((element, index) => {
        fragment.appendChild(
            createSchemaElement(schemaConfig?.pickerOption, {
                option: {
                    className: buildPickerOptionClassName(index === activeIndex),
                    index: String(index),
                    name: element.name,
                    symbol: element.symbol,
                    title: element.name
                }
            })
        );
    });

    container.appendChild(fragment);
}

function createSchemaElement(definition, bindings = {}) {
    if (!definition) {
        throw new Error("Mix zone context runtime schema definition is missing.");
    }

    const factory = createSceneUiFactory();
    return factory.createElement(
        compileSceneSchema(
            resolveSceneSchema(definition, bindings)
        )
    );
}

function buildActionClassName(isActive) {
    return ["mix-zone-context-action", isActive ? "active" : null].filter(Boolean).join(" ");
}

function buildPickerOptionClassName(isActive) {
    return ["mix-zone-picker-option", isActive ? "active" : null].filter(Boolean).join(" ");
}

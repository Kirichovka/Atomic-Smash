import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";

export function createProgressionRuntimeContentBuilder() {
    return {
        renderDiscoveredCompoundCards
    };
}

function renderDiscoveredCompoundCards({
    compounds,
    container,
    onOpenCompoundModal,
    schemaConfig
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!compounds.length) {
        container.appendChild(
            createSchemaElement(schemaConfig?.emptyState, {
                message: "No compounds discovered yet"
            })
        );
        return;
    }

    const fragment = document.createDocumentFragment();
    compounds.forEach(compound => {
        fragment.appendChild(
            createSchemaElement(schemaConfig?.compoundCard, {
                compound: {
                    className: "compound-card clickable",
                    formula: compound.formula,
                    name: compound.name
                },
                handlers: {
                    open: () => onOpenCompoundModal?.(compound)
                }
            })
        );
    });

    container.appendChild(fragment);
}

function createSchemaElement(definition, bindings = {}) {
    if (!definition) {
        throw new Error("Progression runtime schema definition is missing.");
    }

    const factory = createSceneUiFactory();
    return factory.createElement(
        compileSceneSchema(
            resolveSceneSchema(definition, bindings)
        )
    );
}

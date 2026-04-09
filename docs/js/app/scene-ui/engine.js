const PERCENT_STYLE_PROPERTIES = new Set([
    "bottom",
    "columnGap",
    "gap",
    "height",
    "inset",
    "insetBlock",
    "insetBlockEnd",
    "insetBlockStart",
    "insetInline",
    "insetInlineEnd",
    "insetInlineStart",
    "left",
    "margin",
    "marginBottom",
    "marginLeft",
    "marginRight",
    "marginTop",
    "maxHeight",
    "maxWidth",
    "minHeight",
    "minWidth",
    "padding",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "right",
    "rowGap",
    "top",
    "translate",
    "width"
]);

export class SceneLayoutEngine {
    resolveStyleValue(propertyName, value) {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === "number" && PERCENT_STYLE_PROPERTIES.has(propertyName)) {
            return `${value}%`;
        }

        return String(value);
    }

    applyStyles(element, styles = {}) {
        Object.entries(styles).forEach(([propertyName, value]) => {
            const resolvedValue = this.resolveStyleValue(propertyName, value);
            if (resolvedValue !== null) {
                element.style[propertyName] = resolvedValue;
            }
        });
    }
}

export function createSceneLayoutEngine() {
    return new SceneLayoutEngine();
}

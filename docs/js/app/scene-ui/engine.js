import { SCENE_LAYOUT_RULE_KIND } from "./layout-rules.js";

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

    applyLayoutRules(element, layoutRules = []) {
        layoutRules.forEach(rule => {
            const resolvedStyles = this.resolveRule(rule);
            this.applyStyles(element, resolvedStyles);
        });
    }

    resolveRule(rule) {
        if (!rule || typeof rule !== "object") {
            return {};
        }

        if (rule.kind === SCENE_LAYOUT_RULE_KIND.stack) {
            return {
                alignItems: rule.align ?? "stretch",
                display: "flex",
                flexDirection: rule.direction ?? "row",
                gap: rule.gap ?? 0,
                justifyContent: rule.justify ?? "flex-start",
                ...(rule.wrap ? { flexWrap: rule.wrap } : {})
            };
        }

        if (rule.kind === SCENE_LAYOUT_RULE_KIND.inline) {
            return rule.styles ?? {};
        }

        return {};
    }
}

export function createSceneLayoutEngine() {
    return new SceneLayoutEngine();
}

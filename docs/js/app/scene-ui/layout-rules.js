export const SCENE_LAYOUT_RULE_KIND = Object.freeze({
    inline: "inline",
    stack: "stack"
});

export function createInlineLayoutRule(styles = {}) {
    return {
        kind: SCENE_LAYOUT_RULE_KIND.inline,
        styles
    };
}

export function createStackLayoutRule({
    align = "stretch",
    direction = "row",
    gap = 0,
    justify = "flex-start",
    wrap = null
} = {}) {
    return {
        kind: SCENE_LAYOUT_RULE_KIND.stack,
        align,
        direction,
        gap,
        justify,
        wrap
    };
}

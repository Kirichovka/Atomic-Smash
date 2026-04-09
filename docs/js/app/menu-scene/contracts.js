export const MENU_SCENE_ENTITY_KIND = Object.freeze({
    edge: "edge",
    node: "node"
});

export const MENU_SCENE_DEFAULTS = Object.freeze({
    overflowRatio: 34,
    nodeSizeRatios: Object.freeze({
        lg: 20,
        md: 16.5,
        sm: 13.8
    })
});

/**
 * @typedef {Object} MenuSceneNodeContract
 * @property {string} id
 * @property {"node"} kind
 * @property {string} levelId
 * @property {string} title
 * @property {string} subtitle
 * @property {number} x
 * @property {number} y
 * @property {"sm"|"md"|"lg"} size
 * @property {"completed"|"current"|"open"|"locked"} status
 * @property {boolean} isUnlocked
 * @property {Object} theme
 * @property {Object} level
 * @property {Object} options
 */

/**
 * @typedef {Object} MenuSceneEdgeContract
 * @property {string} id
 * @property {"edge"} kind
 * @property {string} fromLevelId
 * @property {string} toLevelId
 */

/**
 * @typedef {Object} MenuSceneSheetContract
 * @property {string} themeId
 * @property {string} routeLabel
 * @property {MenuSceneNodeContract[]} nodes
 * @property {MenuSceneEdgeContract[]} edges
 * @property {Object|null} placeholder
 */

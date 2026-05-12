export const MENU_SCENE_ENTITY_KIND = Object.freeze({
    edge: "edge",
    node: "node"
});

export const MENU_SCENE_DEFAULTS = Object.freeze({
    cameraPanPaddingPixels: 44,
    edgeFitPaddingPixels: 28,
    fitPaddingPixels: 34,
    maxCameraZoom: 2.25,
    minNodeScale: 0.72,
    minCameraZoom: 0.82,
    maxNodeScale: 1,
    nodeColumnClusterPixels: 42,
    nodeHorizontalGapPixels: 48,
    nodeRowClusterPixels: 96,
    overflowRatio: 34,
    nodeLockedScale: 0.88,
    nodeVerticalGapPixels: 24,
    nodeSizePixels: Object.freeze({
        lg: 204,
        md: 150,
        sm: 130
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

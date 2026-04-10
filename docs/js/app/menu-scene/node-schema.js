import { SCENE_ACTION_IDS } from "../contracts/action-ids.js";
import { sceneButton, sceneContainer, sceneText } from "../scene-ui/schema.js";

export function createMenuSceneNodeSchema(node) {
    return sceneButton({
        classNames: [
            "home-level-node",
            `level-size-${node.size}`,
            `level-status-${node.status}`
        ],
        data: {
            levelId: node.levelId
        },
        attrs: {
            disabled: !node.isUnlocked
        },
        on: {
            click: {
                action: SCENE_ACTION_IDS.previewLevelIntro
            }
        },
        children: []
    });
}

export function createMenuSceneNodeBindings(node) {
    return {
        disabled: !node.isUnlocked,
        isUnlocked: node.isUnlocked,
        level: {
            id: node.levelId,
            index: `Level ${node.level.levelNumber ?? resolveMenuSceneLevelNumber(node.levelId)}`
        },
        node: {
            sizeClass: `level-size-${node.size}`,
            statusClass: `level-status-${node.status}`,
            subtitle: node.subtitle,
            title: node.title
        }
    };
}

export function createMenuScenePlaceholderSchema(placeholder) {
    return sceneContainer({
        className: "home-sheet-placeholder",
        children: [
            sceneText({
                className: "home-sheet-placeholder-kicker",
                tagName: "div",
                text: placeholder.kicker
            }),
            sceneText({
                className: "home-sheet-placeholder-title",
                tagName: "div",
                text: placeholder.title
            }),
            sceneText({
                className: "home-sheet-placeholder-body",
                tagName: "div",
                text: placeholder.body
            }),
            sceneText({
                className: "home-sheet-placeholder-meta",
                tagName: "div",
                text: placeholder.meta
            })
        ]
    });
}

export function resolveMenuSceneLevelNumber(levelId) {
    const match = /^level-(\d+)$/.exec(levelId);
    return match ? match[1] : levelId;
}

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
            "aria-disabled": node.isUnlocked ? undefined : "true",
            tabindex: node.isUnlocked ? undefined : -1
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
        ariaDisabled: node.isUnlocked ? undefined : "true",
        isUnlocked: node.isUnlocked,
        tabIndex: node.isUnlocked ? undefined : -1,
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
    const standardMatch = /^level-(\d+)$/i.exec(levelId);
    if (standardMatch) {
        return standardMatch[1];
    }

    const themedMatch = /^[a-z]+-level-(\d+)$/i.exec(levelId);
    if (themedMatch) {
        return themedMatch[1];
    }

    const trailingNumberMatch = /(\d+)$/i.exec(levelId);
    return trailingNumberMatch ? trailingNumberMatch[1] : levelId;
}

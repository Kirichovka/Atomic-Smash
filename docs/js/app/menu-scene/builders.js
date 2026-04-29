import { MenuSceneEdge, MenuSceneSheet, MenuSceneTaskNode } from "./entities.js";
import {
    createSceneNodeStatus,
    createSceneNodeSubtitle,
    createSceneNodeTitle,
    createScenePlaceholder
} from "./methods.js";

export class MenuSceneTaskNodeBuilder {
    constructor({ layoutNode, level, options, theme }) {
        this.layoutNode = layoutNode;
        this.level = level;
        this.options = options;
        this.theme = theme;
        this.briefing = null;
        this.compound = null;
        this.mechanic = null;
    }

    withBriefing(briefing) {
        this.briefing = briefing;
        return this;
    }

    withCompound(compound) {
        this.compound = compound;
        return this;
    }

    withMechanic(mechanic) {
        this.mechanic = mechanic;
        return this;
    }

    build() {
        return new MenuSceneTaskNode({
            id: `scene-node-${this.level.id}`,
            level: this.level,
            levelId: this.level.id,
            options: this.options,
            size: this.layoutNode.size ?? "sm",
            status: createSceneNodeStatus(this.options),
            subtitle: createSceneNodeSubtitle({
                briefing: this.briefing,
                level: this.level,
                mechanic: this.mechanic
            }),
            theme: this.theme,
            title: createSceneNodeTitle({
                briefing: this.briefing,
                compound: this.compound,
                level: this.level
            }),
            x: this.layoutNode.x,
            y: this.layoutNode.y
        });
    }
}

export class MenuSceneEdgeBuilder {
    constructor({ fromLevelId, toLevelId }) {
        this.fromLevelId = fromLevelId;
        this.toLevelId = toLevelId;
    }

    build() {
        return new MenuSceneEdge({
            id: `scene-edge-${this.fromLevelId}-${this.toLevelId}`,
            fromLevelId: this.fromLevelId,
            toLevelId: this.toLevelId
        });
    }
}

export class MenuSceneSheetBuilder {
    constructor({ state, levelBriefsConfig }) {
        this.state = state;
        this.levelBriefsConfig = levelBriefsConfig;
    }

    build({ currentLevel, levels, theme, themeMap }) {
        if (!theme) {
            return new MenuSceneSheet({
                themeId: "",
                routeLabel: "No route selected"
            });
        }

        if (!themeMap || levels.length === 0) {
            return new MenuSceneSheet({
                themeId: theme.id,
                routeLabel: theme.name,
                placeholder: createScenePlaceholder(theme, this.state.catalog.mechanicsById.get(theme.primaryMechanicId))
            });
        }

        const layoutNodes = buildSceneLayoutNodes(levels, themeMap);
        const sceneNodes = layoutNodes.map(layoutNode => {
            const level = levels.find(item => item.id === layoutNode.levelId);
            const compound = this.state.catalog.compoundsById.get(level?.targetCompoundId);
            const briefing = getLevelBriefing(this.levelBriefsConfig, theme.id, level?.id);
            const mechanic = this.state.catalog.mechanicsById.get(level?.mechanicId);
            const options = {
                isCompleted: this.state.progress.completedLevelIds.has(level.id),
                isCurrent: currentLevel?.id === level.id,
                isUnlocked:
                    this.state.progress.completedLevelIds.has(level.id)
                    || currentLevel?.id === level.id
                    || levels[0]?.id === level.id
            };

            return new MenuSceneTaskNodeBuilder({
                layoutNode,
                level,
                options,
                theme
            })
                .withBriefing(briefing)
                .withCompound(compound)
                .withMechanic(mechanic)
                .build();
        });

        const sceneEdges = layoutNodes.flatMap(layoutNode =>
            (layoutNode.edgeTo ?? []).map(targetLevelId =>
                new MenuSceneEdgeBuilder({
                    fromLevelId: layoutNode.levelId,
                    toLevelId: targetLevelId
                }).build()
            )
        );

        return new MenuSceneSheet({
            themeId: theme.id,
            routeLabel: themeMap.routeLabel ?? theme.name,
            nodes: sceneNodes,
            edges: sceneEdges
        });
    }
}

function buildSceneLayoutNodes(levels, themeMap) {
    const configuredNodes = Array.isArray(themeMap?.nodes) ? themeMap.nodes : [];
    if (configuredNodes.length > 0) {
        const levelIds = new Set(levels.map(level => level.id));

        return configuredNodes
            .filter(node => levelIds.has(node.levelId))
            .map(configuredNode => ({
                edgeTo: Array.isArray(configuredNode.edgeTo) ? configuredNode.edgeTo : [],
                levelId: configuredNode.levelId,
                size: configuredNode.size ?? "sm",
                x: configuredNode.x,
                y: configuredNode.y
            }));
    }

    return levels.map((level, index) => {
        return createFallbackLayout(level.id, index);
    });
}

function createFallbackLayout(levelId, index) {
    const column = index % 4;
    const row = Math.floor(index / 4);

    return {
        edgeTo: [],
        levelId,
        size: "sm",
        x: 15 + (column * 22),
        y: 18 + (row * 21)
    };
}

function getLevelBriefing(levelBriefsConfig, themeId, levelId) {
    return levelBriefsConfig?.themes?.[themeId]?.levels?.find(level => level.levelId === levelId) ?? null;
}

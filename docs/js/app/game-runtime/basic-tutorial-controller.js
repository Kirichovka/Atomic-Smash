import { getCompoundById, getCurrentLevel, getCurrentTheme } from "../state.js";

const BASIC_TUTORIAL_THEME_ID = "basic";
const BASIC_TUTORIAL_FIRST_LEVEL_ID = "level-1";
const BASIC_TUTORIAL_BUBBLE_GAP = 16;

export function createBasicTutorialController({
    refs,
    state,
    currentPage,
    isOverlayBlocked,
    onPersist
}) {
    const tutorialState = {
        postLevelStage: null,
        syncFrame: null
    };

    function bind() {
        document.addEventListener("click", scheduleSync, true);
        document.addEventListener("pointerup", scheduleSync, true);
        document.addEventListener("pointercancel", scheduleSync, true);
    }

    function scheduleSync() {
        if (tutorialState.syncFrame !== null) {
            cancelAnimationFrame(tutorialState.syncFrame);
        }

        tutorialState.syncFrame = requestAnimationFrame(() => {
            tutorialState.syncFrame = null;
            sync();
        });
    }

    function sync() {
        if (!refs.tutorialOverlay || !refs.tutorialBubble || !refs.tutorialBubbleText || !refs.tutorialHighlight) {
            return;
        }

        const stageId = getStage();
        if (!stageId || isOverlayBlocked?.()) {
            hide();
            return;
        }

        const stage = getStageConfig(stageId);
        if (!stage?.targetRect) {
            hide();
            return;
        }

        render(stage);
    }

    function resetProgress() {
        tutorialState.postLevelStage = null;
    }

    function setPostLevelStage(stageId) {
        tutorialState.postLevelStage = stageId;
    }

    function getStage() {
        if (currentPage !== "game" || state.progress.basicTutorialCompleted) {
            return null;
        }

        const currentTheme = getCurrentTheme(state);
        if (currentTheme?.id !== BASIC_TUTORIAL_THEME_ID) {
            return null;
        }

        if (state.progress.completedLevelIds.has(BASIC_TUTORIAL_FIRST_LEVEL_ID)) {
            return tutorialState.postLevelStage ?? "after-mix";
        }

        const currentLevel = getCurrentLevel(state);
        if (!currentLevel || currentLevel.id !== BASIC_TUTORIAL_FIRST_LEVEL_ID) {
            return null;
        }

        const targetCompound = getCompoundById(state, currentLevel.targetCompoundId);
        const requiredNodeCount = targetCompound?.ingredients?.length ?? 0;
        const nodeCount = state.board.savedNodes.length;

        if (state.board.dragElementType) {
            return "drop-on-board";
        }

        if (nodeCount < requiredNodeCount) {
            return "pick-next-element";
        }

        if (!isStructureReady(targetCompound)) {
            return "connect-atoms";
        }

        return "mix-compound";
    }

    function getStageConfig(stageId) {
        switch (stageId) {
            case "pick-next-element": {
                const target = getPaletteTarget();
                const nextSymbol = getNextRequiredSymbol();
                return target
                    ? {
                        placement: "right",
                        targetRect: target.getBoundingClientRect(),
                        text: nextSymbol
                            ? `Drag ${nextSymbol} onto the board. Keep following the highlighted element until the full molecule is placed.`
                            : "Drag the highlighted element onto the board to continue building the molecule."
                    }
                    : null;
            }
            case "drop-on-board":
                return refs.mixZone
                    ? {
                        arrow: true,
                        placement: "top-left",
                        targetRect: refs.mixZone.getBoundingClientRect(),
                        text: "Drop the element inside the board area. For H2O, place two H atoms and one O atom first."
                    }
                    : null;
            case "connect-atoms": {
                const connectionHint = getConnectionHint();
                return connectionHint
                    ? {
                        arrow: false,
                        arrowFromRect: connectionHint.arrowFromRect,
                        arrowToRect: connectionHint.arrowToRect,
                        placement: "top",
                        primaryLabel: connectionHint.primaryLabel,
                        secondaryLabel: connectionHint.secondaryLabel,
                        secondaryTargetRect: connectionHint.secondaryTargetRect,
                        targetRect: connectionHint.target.getBoundingClientRect(),
                        text: connectionHint.text
                    }
                    : null;
            }
            case "mix-compound":
                return refs.mixButton
                    ? {
                        placement: "bottom-left",
                        targetRect: refs.mixButton.getBoundingClientRect(),
                        text: "Once the atoms and connections are ready, press Mix and the game will check your molecule."
                    }
                    : null;
            case "after-mix": {
                const target = getPostMixTarget();
                return target
                    ? {
                        actionLabel: "Next",
                        onAction: () => {
                            tutorialState.postLevelStage = "hotkeys";
                            scheduleSync();
                        },
                        placement: "bottom-left",
                        targetRect: target.getBoundingClientRect(),
                        text: "After Mix, the game checks the ingredients and the links, then shows the result in the top panel."
                    }
                    : null;
            }
            case "hotkeys":
                return refs.controls
                    ? {
                        actionLabel: "Next",
                        onAction: () => {
                            tutorialState.postLevelStage = "journal-nav";
                            scheduleSync();
                        },
                        placement: "bottom-left",
                        targetRect: refs.controls.getBoundingClientRect(),
                        text: "Hotkeys: Shift + A opens the add menu, Shift + M runs Mix, Shift + R clears the board, Delete removes the selection, and Esc closes overlays."
                    }
                    : null;
            case "journal-nav":
                return refs.journalButton
                    ? {
                        actionLabel: "Next",
                        onAction: () => {
                            tutorialState.postLevelStage = "menu-nav";
                            scheduleSync();
                        },
                        placement: "bottom-left",
                        targetRect: refs.journalButton.getBoundingClientRect(),
                        text: "Use Journal to review discovered compounds and the elements you have already unlocked."
                    }
                    : null;
            case "menu-nav":
                return refs.menuButton
                    ? {
                        actionLabel: "Got it",
                        onAction: () => {
                            tutorialState.postLevelStage = null;
                            state.progress.basicTutorialCompleted = true;
                            onPersist?.();
                            hide();
                        },
                        placement: "bottom-left",
                        targetRect: refs.menuButton.getBoundingClientRect(),
                        text: "Use Menu whenever you want to leave the lab, return to navigation, and pick a different section."
                    }
                    : null;
            default:
                return null;
        }
    }

    function render(stage) {
        refs.tutorialOverlay.classList.remove("hidden");
        refs.tutorialOverlay.setAttribute("aria-hidden", "false");
        refs.tutorialBubbleText.textContent = stage.text;

        if (refs.tutorialBubbleAction) {
            refs.tutorialBubbleAction.onclick = null;
            if (stage.actionLabel && typeof stage.onAction === "function") {
                refs.tutorialBubbleAction.textContent = stage.actionLabel;
                refs.tutorialBubbleAction.classList.remove("hidden");
                refs.tutorialBubbleAction.onclick = stage.onAction;
            } else {
                refs.tutorialBubbleAction.classList.add("hidden");
                refs.tutorialBubbleAction.textContent = "";
            }
        }

        positionHighlight(refs.tutorialHighlight, stage.targetRect);
        setHighlightLabel(refs.tutorialHighlight, stage.primaryLabel);

        if (stage.secondaryTargetRect && refs.tutorialHighlightSecondary) {
            refs.tutorialHighlightSecondary.classList.remove("hidden");
            positionHighlight(refs.tutorialHighlightSecondary, stage.secondaryTargetRect, 8);
            setHighlightLabel(refs.tutorialHighlightSecondary, stage.secondaryLabel);
        } else {
            refs.tutorialHighlightSecondary?.classList.add("hidden");
            setHighlightLabel(refs.tutorialHighlightSecondary, null);
        }

        refs.tutorialBubble.style.left = "-9999px";
        refs.tutorialBubble.style.top = "-9999px";
        refs.tutorialBubble.style.maxWidth = "300px";

        const bubbleRect = refs.tutorialBubble.getBoundingClientRect();
        const bubblePosition = getBubblePosition(stage.targetRect, bubbleRect, stage.placement);
        refs.tutorialBubble.style.left = `${bubblePosition.left}px`;
        refs.tutorialBubble.style.top = `${bubblePosition.top}px`;

        positionArrow(stage, refs.tutorialBubble.getBoundingClientRect());
    }

    function hide() {
        refs.tutorialOverlay?.classList.add("hidden");
        refs.tutorialOverlay?.setAttribute("aria-hidden", "true");
        refs.tutorialArrow?.classList.add("hidden");
        refs.tutorialHighlightSecondary?.classList.add("hidden");
        setHighlightLabel(refs.tutorialHighlight, null);
        setHighlightLabel(refs.tutorialHighlightSecondary, null);

        if (refs.tutorialBubbleAction) {
            refs.tutorialBubbleAction.onclick = null;
        }
    }

    function getPaletteTarget() {
        if (!refs.elementList) {
            return null;
        }

        const preferredSymbol = getNextRequiredSymbol();
        const preferredTile = preferredSymbol
            ? refs.elementList.querySelector(`.element-template[data-element="${preferredSymbol}"]`)
            : null;

        return preferredTile ?? refs.elementList.querySelector(".element-template");
    }

    function getNextRequiredSymbol() {
        const currentLevel = getCurrentLevel(state);
        const targetCompound = currentLevel ? getCompoundById(state, currentLevel.targetCompoundId) : null;
        const requiredSymbols = targetCompound?.structure?.nodes ?? targetCompound?.ingredients ?? [];

        if (!Array.isArray(requiredSymbols) || requiredSymbols.length === 0) {
            return null;
        }

        const remainingCounts = new Map();
        requiredSymbols.forEach(symbol => {
            remainingCounts.set(symbol, (remainingCounts.get(symbol) ?? 0) + 1);
        });

        state.board.savedNodes.forEach(node => {
            const remainingCount = remainingCounts.get(node.symbol) ?? 0;
            if (remainingCount > 0) {
                remainingCounts.set(node.symbol, remainingCount - 1);
            }
        });

        return requiredSymbols.find(symbol => (remainingCounts.get(symbol) ?? 0) > 0) ?? null;
    }

    function getConnectionHint() {
        const currentLevel = getCurrentLevel(state);
        const targetCompound = currentLevel ? getCompoundById(state, currentLevel.targetCompoundId) : null;
        const structureNodes = targetCompound?.structure?.nodes;
        const structureEdges = targetCompound?.structure?.edges;

        if (!Array.isArray(structureNodes) || !Array.isArray(structureEdges)) {
            const fallbackNode = refs.mixZone?.querySelector(".node");
            const fallbackTarget = fallbackNode?.querySelector(".connector.right")
                ?? fallbackNode?.querySelector(".connector")
                ?? null;

            return fallbackTarget
                ? {
                    arrowFromRect: fallbackTarget.getBoundingClientRect(),
                    arrowToRect: refs.mixZone?.getBoundingClientRect() ?? null,
                    primaryLabel: "Start here",
                    secondaryLabel: "Target area",
                    secondaryTargetRect: refs.mixZone?.getBoundingClientRect() ?? null,
                    target: fallbackNode ?? fallbackTarget,
                    text: "Start from this atom and drag the bond toward the highlighted target area."
                }
                : null;
        }

        const missingEdgeGuide = getMissingEdgeGuide(structureNodes, structureEdges);
        if (!missingEdgeGuide) {
            return null;
        }

        const fromNodeElement = refs.mixZone?.querySelector(`.node[data-id="${missingEdgeGuide.fromNodeId}"]`);
        const toNodeElement = refs.mixZone?.querySelector(`.node[data-id="${missingEdgeGuide.toNodeId}"]`);
        const fromConnector = getConnectorTowardNode(fromNodeElement, toNodeElement);
        const toConnector = getConnectorTowardNode(toNodeElement, fromNodeElement);
        if (!fromConnector || !toConnector) {
            return null;
        }

        const fromName = state.catalog.elements.find(element => element.symbol === missingEdgeGuide.fromSymbol)?.name
            ?? missingEdgeGuide.fromSymbol;
        const toName = state.catalog.elements.find(element => element.symbol === missingEdgeGuide.toSymbol)?.name
            ?? missingEdgeGuide.toSymbol;

        return {
            arrowFromRect: fromConnector.getBoundingClientRect(),
            arrowToRect: toConnector.getBoundingClientRect(),
            primaryLabel: "Start here",
            secondaryLabel: "Connect here",
            secondaryTargetRect: toConnector.getBoundingClientRect(),
            target: fromConnector,
            text: missingEdgeGuide.remainingEdges > 1
                ? `Start from this ${fromName} atom and drag the bond to the highlighted ${toName} atom.`
                : `Make the last bond by dragging from this ${fromName} atom to the highlighted ${toName} atom.`
        };
    }

    function getPostMixTarget() {
        if (refs.result && refs.result.textContent?.trim()) {
            return refs.result;
        }

        return refs.mixButton ?? null;
    }

    function isStructureReady(targetCompound) {
        const structure = targetCompound?.structure;
        if (!structure?.nodes || !structure?.edges) {
            const requiredConnectionCount = targetCompound?.ingredients?.length
                ? Math.max(targetCompound.ingredients.length - 1, 0)
                : 0;
            return state.board.savedConnections.length >= requiredConnectionCount;
        }

        return !getMissingEdgeGuide(structure.nodes, structure.edges);
    }

    function getMissingEdgeGuide(structureNodes, structureEdges) {
        const mapping = findBestNodeMapping(structureNodes, structureEdges);
        if (!mapping) {
            return null;
        }

        const boardEdgeSet = new Set(
            state.board.savedConnections.map(connection => createLocalEdgeKey(connection.fromNodeId, connection.toNodeId))
        );

        for (const [fromIndex, toIndex] of structureEdges) {
            const fromNodeId = mapping[fromIndex];
            const toNodeId = mapping[toIndex];
            if (!fromNodeId || !toNodeId) {
                continue;
            }

            if (!boardEdgeSet.has(createLocalEdgeKey(fromNodeId, toNodeId))) {
                return {
                    fromNodeId,
                    fromSymbol: structureNodes[fromIndex],
                    remainingEdges: structureEdges.length - countSatisfiedMappedEdges(structureEdges, mapping, boardEdgeSet),
                    toNodeId,
                    toSymbol: structureNodes[toIndex]
                };
            }
        }

        return null;
    }

    function findBestNodeMapping(structureNodes, structureEdges) {
        if (state.board.savedNodes.length < structureNodes.length) {
            return null;
        }

        const boardNodesBySymbol = new Map();
        state.board.savedNodes.forEach(node => {
            const list = boardNodesBySymbol.get(node.symbol) ?? [];
            list.push(node.id);
            boardNodesBySymbol.set(node.symbol, list);
        });

        if (structureNodes.some(symbol => !(boardNodesBySymbol.get(symbol)?.length))) {
            return null;
        }

        const boardEdgeSet = new Set(
            state.board.savedConnections.map(connection => createLocalEdgeKey(connection.fromNodeId, connection.toNodeId))
        );
        const assignments = new Array(structureNodes.length).fill(null);
        let bestMapping = null;
        let bestScore = -1;

        function backtrack(index, usedNodeIds) {
            if (index >= structureNodes.length) {
                const score = countSatisfiedMappedEdges(structureEdges, assignments, boardEdgeSet);
                if (score > bestScore) {
                    bestScore = score;
                    bestMapping = [...assignments];
                }
                return;
            }

            const symbol = structureNodes[index];
            const candidates = boardNodesBySymbol.get(symbol) ?? [];
            candidates.forEach(nodeId => {
                if (usedNodeIds.has(nodeId)) {
                    return;
                }

                assignments[index] = nodeId;
                usedNodeIds.add(nodeId);
                backtrack(index + 1, usedNodeIds);
                usedNodeIds.delete(nodeId);
                assignments[index] = null;
            });
        }

        backtrack(0, new Set());
        return bestMapping;
    }

    return {
        bind,
        hide,
        resetProgress,
        scheduleSync,
        setPostLevelStage
    };
}

function positionHighlight(highlightElement, targetRect, padding = 10) {
    if (!highlightElement) {
        return;
    }

    highlightElement.style.left = `${Math.max(targetRect.left - padding, 8)}px`;
    highlightElement.style.top = `${Math.max(targetRect.top - padding, 8)}px`;
    highlightElement.style.width = `${Math.max(targetRect.width + (padding * 2), 24)}px`;
    highlightElement.style.height = `${Math.max(targetRect.height + (padding * 2), 24)}px`;
}

function setHighlightLabel(highlightElement, label) {
    if (!highlightElement) {
        return;
    }

    if (label) {
        highlightElement.dataset.label = label;
        return;
    }

    delete highlightElement.dataset.label;
}

function positionArrow(stage, bubbleRect) {
    const tutorialArrow = document.getElementById("tutorial-arrow");
    if (!tutorialArrow) {
        return;
    }

    if (stage.arrowFromRect && stage.arrowToRect) {
        const startX = stage.arrowFromRect.left + (stage.arrowFromRect.width / 2);
        const startY = stage.arrowFromRect.top + (stage.arrowFromRect.height / 2);
        const endX = stage.arrowToRect.left + (stage.arrowToRect.width / 2);
        const endY = stage.arrowToRect.top + (stage.arrowToRect.height / 2);
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.max(Math.hypot(deltaX, deltaY) - 18, 24);
        const angle = Math.atan2(deltaY, deltaX);

        tutorialArrow.classList.remove("hidden");
        tutorialArrow.style.left = `${startX}px`;
        tutorialArrow.style.top = `${startY}px`;
        tutorialArrow.style.width = `${length}px`;
        tutorialArrow.style.transform = `rotate(${angle}rad)`;
        return;
    }

    if (!stage.arrow) {
        tutorialArrow.classList.add("hidden");
        return;
    }

    const startX = bubbleRect.left + (bubbleRect.width / 2);
    const startY = bubbleRect.top + (bubbleRect.height / 2);
    const endX = stage.targetRect.left + (stage.targetRect.width / 2);
    const endY = stage.targetRect.top + Math.min(stage.targetRect.height * 0.35, 72);
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const length = Math.max(Math.hypot(deltaX, deltaY) - 22, 48);
    const angle = Math.atan2(deltaY, deltaX);

    tutorialArrow.classList.remove("hidden");
    tutorialArrow.style.left = `${startX}px`;
    tutorialArrow.style.top = `${startY}px`;
    tutorialArrow.style.width = `${length}px`;
    tutorialArrow.style.transform = `rotate(${angle}rad)`;
}

function getBubblePosition(targetRect, bubbleRect, placement = "bottom-left") {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxLeft = Math.max(viewportWidth - bubbleRect.width - 12, 12);
    const maxTop = Math.max(viewportHeight - bubbleRect.height - 12, 12);

    const preferredPositions = {
        "bottom-left": { left: targetRect.left, top: targetRect.bottom + BASIC_TUTORIAL_BUBBLE_GAP },
        right: { left: targetRect.right + BASIC_TUTORIAL_BUBBLE_GAP, top: targetRect.top + ((targetRect.height - bubbleRect.height) / 2) },
        top: { left: targetRect.left + ((targetRect.width - bubbleRect.width) / 2), top: targetRect.top - bubbleRect.height - BASIC_TUTORIAL_BUBBLE_GAP },
        "top-left": { left: targetRect.left + 12, top: targetRect.top + 12 }
    };
    const preferred = preferredPositions[placement] ?? preferredPositions["bottom-left"];

    return {
        left: Math.min(Math.max(preferred.left, 12), maxLeft),
        top: Math.min(Math.max(preferred.top, 12), maxTop)
    };
}

function countSatisfiedMappedEdges(structureEdges, mapping, boardEdgeSet) {
    return structureEdges.reduce((count, [fromIndex, toIndex]) => {
        const fromNodeId = mapping[fromIndex];
        const toNodeId = mapping[toIndex];
        if (!fromNodeId || !toNodeId) {
            return count;
        }

        return count + (boardEdgeSet.has(createLocalEdgeKey(fromNodeId, toNodeId)) ? 1 : 0);
    }, 0);
}

function getConnectorTowardNode(fromNodeElement, toNodeElement) {
    if (!fromNodeElement || !toNodeElement) {
        return null;
    }

    const fromRect = fromNodeElement.getBoundingClientRect();
    const toRect = toNodeElement.getBoundingClientRect();
    const deltaX = (toRect.left + (toRect.width / 2)) - (fromRect.left + (fromRect.width / 2));
    const deltaY = (toRect.top + (toRect.height / 2)) - (fromRect.top + (fromRect.height / 2));

    let connectorSelector = ".connector.right";
    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
        connectorSelector = deltaX >= 0 ? ".connector.right" : ".connector.left";
    } else {
        connectorSelector = deltaY >= 0 ? ".connector.bottom" : ".connector.top";
    }

    return fromNodeElement.querySelector(connectorSelector)
        ?? fromNodeElement.querySelector(".connector");
}

function createLocalEdgeKey(leftId, rightId) {
    return [leftId, rightId].sort().join("|");
}

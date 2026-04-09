export function createSceneNodeStatus({ isCompleted, isCurrent, isUnlocked }) {
    if (isCompleted) {
        return "completed";
    }

    if (isCurrent) {
        return "current";
    }

    return isUnlocked ? "open" : "locked";
}

export function createSceneNodeTitle({ briefing, compound, level }) {
    return briefing?.nodeTitle ?? level.displayTitle ?? compound?.name ?? level.hint ?? level.id;
}

export function createSceneNodeSubtitle({ briefing, mechanic, level }) {
    return briefing?.mechanicName ?? mechanic?.name ?? level.mechanicId ?? "Lesson";
}

export function getMenuStageOverflow(menuScreenElement) {
    if (!menuScreenElement) {
        return 0;
    }

    const overflowValue = getComputedStyle(menuScreenElement).getPropertyValue("--home-map-overflow");
    const overflow = Number.parseFloat(overflowValue);
    return Number.isFinite(overflow) ? Math.max(overflow, 0) : 0;
}

export function projectNodeToViewport(space, camera, node) {
    return space.project(node, camera);
}

export function createSceneEdgePath(fromNodeElement, toNodeElement, mapRect) {
    const fromRect = fromNodeElement.getBoundingClientRect();
    const toRect = toNodeElement.getBoundingClientRect();
    const fromCenter = {
        x: (fromRect.left - mapRect.left) + (fromRect.width / 2),
        y: (fromRect.top - mapRect.top) + (fromRect.height / 2)
    };
    const toCenter = {
        x: (toRect.left - mapRect.left) + (toRect.width / 2),
        y: (toRect.top - mapRect.top) + (toRect.height / 2)
    };
    const deltaX = toCenter.x - fromCenter.x;
    const deltaY = toCenter.y - fromCenter.y;
    const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const fromRadius = Math.min(fromRect.width, fromRect.height) / 2;
    const toRadius = Math.min(toRect.width, toRect.height) / 2;
    const inset = Math.min(fromRadius, toRadius) * 0.18;
    const start = {
        x: fromCenter.x + (unitX * (fromRadius - inset)),
        y: fromCenter.y + (unitY * (fromRadius - inset))
    };
    const end = {
        x: toCenter.x - (unitX * (toRadius - inset)),
        y: toCenter.y - (unitY * (toRadius - inset))
    };
    const verticalDistance = end.y - start.y;
    const horizontalDistance = end.x - start.x;
    const controlLift = Math.max(
        Math.abs(verticalDistance) * 0.36,
        Math.min(mapRect.width, mapRect.height) * 0.038
    );
    const shallowCurveThreshold = mapRect.height * 0.08;
    const shallowCurveLift = Math.min(mapRect.width, mapRect.height) * 0.03;

    if (Math.abs(verticalDistance) < shallowCurveThreshold) {
        const controlX1 = start.x + (horizontalDistance * 0.3);
        const controlX2 = end.x - (horizontalDistance * 0.3);
        const controlY = start.y - shallowCurveLift;
        return `M ${start.x} ${start.y} C ${controlX1} ${controlY}, ${controlX2} ${controlY}, ${end.x} ${end.y}`;
    }

    return `M ${start.x} ${start.y} C ${start.x} ${start.y + controlLift}, ${end.x} ${end.y - controlLift}, ${end.x} ${end.y}`;
}

export function createScenePlaceholder(theme, mechanic) {
    return {
        body: theme.description,
        kicker: theme.schoolTopic ?? "Chemistry topic",
        meta: `${mechanic?.name ?? theme.primaryMechanicId ?? "Mechanic"} | Sheet in design`,
        title: theme.name
    };
}

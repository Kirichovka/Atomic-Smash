export function bindConnectionLabResizeObserver({ mixZone, sync }) {
    if (typeof ResizeObserver !== "function" || !mixZone) {
        return {
            disconnect() {}
        };
    }

    let resizeSyncFrame = null;
    const resizeObserver = new ResizeObserver(() => {
        if (resizeSyncFrame !== null) {
            cancelAnimationFrame(resizeSyncFrame);
        }

        resizeSyncFrame = requestAnimationFrame(() => {
            resizeSyncFrame = null;
            sync();
        });
    });

    resizeObserver.observe(mixZone);

    return {
        disconnect() {
            if (resizeSyncFrame !== null) {
                cancelAnimationFrame(resizeSyncFrame);
                resizeSyncFrame = null;
            }

            resizeObserver.disconnect();
        }
    };
}

export function bindConnectionLabWorkspaceInteractions({
    refs,
    board,
    boardSelection,
    createNodeFromDrop,
    isPointInsideMixZone,
    publishInteractionContext
}) {
    if (!refs.workspace || !refs.mixZone) {
        return {
            destroy() {}
        };
    }

    const handleDragOver = event => {
        event.preventDefault();
    };

    const handleMixZonePointerDown = event => {
        if (event.target.closest(".node")) {
            return;
        }

        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        boardSelection.clearSelectedNodes({ notify: false });
        publishInteractionContext({
            source: "mix-zone-background",
            zone: "mix-zone",
            clearPaletteSelection: true,
            inspectedSymbol: null,
            persist: false
        });
    };

    const handleDrop = event => {
        event.preventDefault();
        if (!board.dragElementType) {
            return;
        }

        const droppedSymbol = board.dragElementType;
        board.dragElementType = null;

        if (!isPointInsideMixZone(event.clientX, event.clientY)) {
            return;
        }

        createNodeFromDrop(droppedSymbol, event.clientX, event.clientY);
    };

    refs.workspace.addEventListener("dragover", handleDragOver);
    refs.mixZone.addEventListener("pointerdown", handleMixZonePointerDown);
    refs.workspace.addEventListener("drop", handleDrop);

    return {
        destroy() {
            refs.workspace?.removeEventListener("dragover", handleDragOver);
            refs.mixZone?.removeEventListener("pointerdown", handleMixZonePointerDown);
            refs.workspace?.removeEventListener("drop", handleDrop);
        }
    };
}

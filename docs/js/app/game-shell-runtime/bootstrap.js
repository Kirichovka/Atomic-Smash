import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema } from "../scene-ui/schema.js";

export function createGameShellRuntimeContentBuilder() {
    return {
        renderGameShellBootstrap
    };
}

function renderGameShellBootstrap({
    schemaConfig
}) {
    if (document.body.dataset.page !== "game") {
        return;
    }

    const sidebarContent = document.getElementById("sidebar-content");
    const topbar = document.getElementById("topbar");
    const compoundZone = document.getElementById("compound-zone");

    if (!sidebarContent || !topbar || !compoundZone) {
        return;
    }

    const factory = createSceneUiFactory();

    renderIntoRoot(factory, sidebarContent, schemaConfig?.sidebarContent);
    renderIntoRoot(factory, topbar, schemaConfig?.topbar);
    renderIntoRoot(factory, compoundZone, schemaConfig?.compoundZone);
}

function renderIntoRoot(factory, root, definition) {
    if (!definition) {
        throw new Error("Game shell runtime schema definition is missing.");
    }

    root.replaceChildren(
        ...compileSceneSchema(definition).children.map(child => factory.createElement(child))
    );
}

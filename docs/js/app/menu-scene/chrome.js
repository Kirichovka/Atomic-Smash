import { createSceneUiFactory } from "../scene-ui/factory.js";
import {
    compileSceneSchema,
    resolveSceneSchema,
    sceneButton,
    sceneContainer,
    sceneStack,
    sceneText
} from "../scene-ui/schema.js";

export function createHomeChromeController({ refs, schemaConfig = null, actionRegistry = {} }) {
    const factory = createSceneUiFactory();

    function renderScaffold() {
        renderHeaderScaffold();
        renderToolbarScaffold();
    }

    function renderHeaderState({ routeName, routeProgress }) {
        const routeNameElement = document.getElementById("menu-route-name");
        const routeProgressElement = document.getElementById("menu-route-progress");

        if (routeNameElement) {
            routeNameElement.textContent = routeName ?? "No route selected";
        }

        if (routeProgressElement) {
            routeProgressElement.textContent = routeProgress ?? "Choose a theme to begin";
        }
    }

    function renderHeaderScaffold() {
        if (!refs.menuHeaderRoot) {
            return;
        }

        refs.menuHeaderRoot.replaceChildren(
            factory.createElement(
                compileSceneSchema(
                    resolveSceneSchema(schemaConfig?.header ?? createHeaderSchema(), {}, actionRegistry)
                )
            )
        );
    }

    function renderToolbarScaffold() {
        if (!refs.menuToolbarRoot) {
            return;
        }

        refs.menuToolbarRoot.replaceChildren(
            factory.createElement(
                compileSceneSchema(
                    resolveSceneSchema(schemaConfig?.toolbar ?? createToolbarSchema(), {}, actionRegistry)
                )
            )
        );
    }

    return {
        renderHeaderState,
        renderScaffold
    };
}

function createHeaderSchema() {
    return sceneContainer({
        children: [
            sceneContainer({
                attrs: { "aria-hidden": "true" },
                className: "home-header-bar"
            }),
            sceneStack({
                align: "center",
                className: "home-header-row",
                gap: 1.7,
                justify: "space-between",
                children: [
                    sceneContainer({
                        attrs: {
                            "aria-label": "Atomic Smash home",
                            role: "link"
                        },
                        className: "home-brand",
                        children: [
                            sceneText({
                                className: "home-brand-mark",
                                text: "\u269B"
                            }),
                            sceneContainer({
                                className: "home-brand-copy",
                                children: [
                                    sceneText({
                                        tagName: "strong",
                                        text: "Atomic Smash"
                                    }),
                                    sceneText({
                                        tagName: "span",
                                        text: "Chemistry sandbox"
                                    })
                                ]
                            })
                        ]
                    }),
                    sceneStack({
                        align: "center",
                        className: "home-header-actions",
                        gap: 1.05,
                        children: [
                            sceneButton({
                                attrs: { "aria-label": "Settings" },
                                className: "home-icon-button",
                                text: "\u2699"
                            }),
                            sceneButton({
                                attrs: { "aria-label": "Profile" },
                                classNames: ["home-icon-button", "home-icon-button-profile"],
                                text: "\u25CC"
                            })
                        ]
                    })
                ]
            }),
            sceneStack({
                align: "center",
                className: "home-header-strap",
                gap: 1.35,
                justify: "space-between",
                wrap: "wrap",
                children: [
                    sceneStack({
                        align: "center",
                        className: "home-route-meta",
                        gap: 1.05,
                        wrap: "wrap",
                        children: [
                            sceneText({
                                className: "home-header-pill",
                                text: "Current Route"
                            }),
                            sceneContainer({
                                className: "home-route-copy",
                                children: [
                                    sceneText({
                                        id: "menu-route-name",
                                        tagName: "strong",
                                        text: "Basic"
                                    }),
                                    sceneText({
                                        id: "menu-route-progress",
                                        tagName: "span",
                                        text: "0/0 complete"
                                    })
                                ]
                            })
                        ]
                    }),
                    sceneStack({
                        align: "center",
                        className: "home-header-nav",
                        gap: 0.85,
                        wrap: "wrap",
                        children: [
                            sceneButton({
                                className: "home-header-link",
                                id: "menu-journal-btn",
                                text: "Journal"
                            }),
                            sceneButton({
                                classNames: ["home-header-link", "home-header-link-primary"],
                                id: "menu-continue-btn",
                                text: "Continue"
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

function createToolbarSchema() {
    return sceneStack({
        align: "center",
        gap: 1.2,
        justify: "space-between",
        children: [
            sceneButton({
                attrs: { "aria-label": "Previous theme sheet" },
                className: "home-sheet-arrow",
                id: "menu-prev-theme-btn",
                text: "<"
            }),
            sceneContainer({
                attrs: { "aria-label": "Theme sheets" },
                className: "home-sheet-dots",
                id: "menu-sheet-dots"
            }),
            sceneButton({
                attrs: { "aria-label": "Next theme sheet" },
                className: "home-sheet-arrow",
                id: "menu-next-theme-btn",
                text: ">"
            })
        ]
    });
}

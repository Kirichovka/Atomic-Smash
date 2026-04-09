import { SceneButtonBuilder, SceneContainerBuilder, SceneTextBuilder } from "../scene-ui/builders.js";
import { createSceneUiFactory } from "../scene-ui/factory.js";
import { SceneStackLayoutBuilder } from "../scene-ui/layouts.js";

export function createHomeChromeController({ refs }) {
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
                new SceneContainerBuilder()
                    .children([
                        new SceneContainerBuilder()
                            .className("home-header-bar")
                            .attr("aria-hidden", "true")
                            .build(),
                        new SceneStackLayoutBuilder({ direction: "row", gap: 1.7 })
                            .className("home-header-row")
                            .align("center")
                            .justify("space-between")
                            .build([
                                new SceneContainerBuilder()
                                    .className("home-brand")
                                    .attr("aria-label", "Atomic Smash home")
                                    .attr("role", "link")
                                    .children([
                                        new SceneTextBuilder()
                                            .className("home-brand-mark")
                                            .text("☣")
                                            .build(),
                                        new SceneContainerBuilder()
                                            .className("home-brand-copy")
                                            .children([
                                                new SceneTextBuilder()
                                                    .tagName("strong")
                                                    .text("Atomic Smash")
                                                    .build(),
                                                new SceneTextBuilder()
                                                    .tagName("span")
                                                    .text("Chemistry sandbox")
                                                    .build()
                                            ])
                                            .build()
                                    ])
                                    .build(),
                                new SceneStackLayoutBuilder({ direction: "row", gap: 1.05 })
                                    .className("home-header-actions")
                                    .align("center")
                                    .build([
                                        new SceneButtonBuilder()
                                            .className("home-icon-button")
                                            .attr("aria-label", "Settings")
                                            .label("⚙")
                                            .build(),
                                        new SceneButtonBuilder()
                                            .className("home-icon-button", "home-icon-button-profile")
                                            .attr("aria-label", "Profile")
                                            .label("◌")
                                            .build()
                                    ])
                            ]),
                        new SceneStackLayoutBuilder({ direction: "row", gap: 1.35 })
                            .className("home-header-strap")
                            .align("center")
                            .justify("space-between")
                            .wrap()
                            .build([
                                new SceneStackLayoutBuilder({ direction: "row", gap: 1.05 })
                                    .className("home-route-meta")
                                    .align("center")
                                    .wrap()
                                    .build([
                                        new SceneTextBuilder()
                                            .className("home-header-pill")
                                            .text("Current Route")
                                            .build(),
                                        new SceneContainerBuilder()
                                            .className("home-route-copy")
                                            .children([
                                                new SceneTextBuilder()
                                                    .tagName("strong")
                                                    .id("menu-route-name")
                                                    .text("Basic")
                                                    .build(),
                                                new SceneTextBuilder()
                                                    .tagName("span")
                                                    .id("menu-route-progress")
                                                    .text("0/0 complete")
                                                    .build()
                                            ])
                                            .build()
                                    ]),
                                new SceneStackLayoutBuilder({ direction: "row", gap: 0.85 })
                                    .className("home-header-nav")
                                    .align("center")
                                    .wrap()
                                    .build([
                                        new SceneButtonBuilder()
                                            .id("menu-journal-btn")
                                            .className("home-header-link")
                                            .label("Journal")
                                            .build(),
                                        new SceneButtonBuilder()
                                            .id("menu-continue-btn")
                                            .className("home-header-link", "home-header-link-primary")
                                            .label("Continue")
                                            .build()
                                    ])
                            ])
                    ])
                    .build()
            )
        );
    }

    function renderToolbarScaffold() {
        if (!refs.menuToolbarRoot) {
            return;
        }

        refs.menuToolbarRoot.replaceChildren(
            factory.createElement(
                new SceneStackLayoutBuilder({ direction: "row", gap: 1.2 })
                    .align("center")
                    .justify("space-between")
                    .build([
                        new SceneButtonBuilder()
                            .id("menu-prev-theme-btn")
                            .className("home-sheet-arrow")
                            .attr("aria-label", "Previous theme sheet")
                            .label("<")
                            .build(),
                        new SceneContainerBuilder()
                            .id("menu-sheet-dots")
                            .className("home-sheet-dots")
                            .attr("aria-label", "Theme sheets")
                            .build(),
                        new SceneButtonBuilder()
                            .id("menu-next-theme-btn")
                            .className("home-sheet-arrow")
                            .attr("aria-label", "Next theme sheet")
                            .label(">")
                            .build()
                    ])
            )
        );
    }

    return {
        renderHeaderState,
        renderScaffold
    };
}

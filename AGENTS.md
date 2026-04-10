# AGENTS

## Purpose

This repository has been moving from ad-hoc DOM code toward a layered runtime:

- `data -> state -> controllers -> scene/runtime -> DOM`
- `JSON schema -> validator -> bindings/actions -> scene-ui -> rendered UI`

This file is a practical guide for AI/code agents so changes land in the right layer and do not reintroduce recent bugs.

## Top-Level Architecture

### Entry

- `docs/js/game.js`
  - application bootstrap/composition root
  - loads data + runtime schema configs
  - creates refs, state, event bus, runtime

- `docs/js/data.js`
  - loads JSON data
  - validates runtime schema configs

### Runtime

- `docs/js/app/game-runtime/runtime.js`
  - assembles controllers
  - navigation
  - modals
  - palette
  - sidebar
  - tutorial
  - gameplay
  - mix-zone context
  - mechanics registry

### Scene UI

- `docs/js/app/scene-ui/*`
  - schema compilation
  - validation
  - primitives
  - action resolution
  - DOM factory

Use this for regular UI, panels, cards, modals, chrome, and screen shells.

### Home/Menu Scene

- `docs/js/app/menu-scene/*`
  - scene builders
  - node schema
  - renderers
  - layout runtime
  - controller

This is the structured version of the old hand-written homepage map logic.

### Board / Mix Zone

- `docs/js/app/board-scene/*`
  - geometry
  - state
  - render
  - selection
  - drag session
  - connection session
  - mutation
  - view

### Mechanics

- `docs/js/app/mechanics/*`
  - manifest/adapters/contracts
  - mechanic implementations
- current main mechanic:
  - `docs/js/app/mechanics/connection-lab/index.js`

## Current Runtime UI Rule

If a feature is ordinary UI, prefer:

1. runtime schema JSON in `docs/data/*.schema.json`
2. builder/runtime wrapper
3. controller wiring

If a feature is interactive board logic, prefer:

1. `board-scene` controller/session/state layer
2. mechanic orchestration
3. SVG/DOM as a render target, not the source of truth

## Menu Scene Notes

### What controls node size

Home/menu node size is **not CSS width-driven**.

Current source of truth:

- `docs/js/app/menu-scene/contracts.js`
- `docs/js/app/menu-scene/entities.js`
- `docs/js/app/menu-scene/renderers.js`

Renderer writes inline width:

- `element.style.width = "...px"`

CSS only affects:

- typography
- padding
- border
- shadows
- visual compactness

### Important past issue

Node size appeared not to change because:

- `.home-level-node` used percentage padding in CSS
- percentage padding was effectively inflating visual size
- runtime width changed, but visual circle stayed large

Fix that was applied:

- `docs/styles/pages/menu.css`
  - `box-sizing: border-box`
  - `padding: 0`

### Current node size policy

Menu nodes are currently sized by state:

- unlocked/clickable: `200px`
- locked: `170px`

Implemented in:

- `docs/js/app/menu-scene/contracts.js`
- `docs/js/app/menu-scene/entities.js`

### Menu map source of truth

When `themeMap.nodes` exists, it should be treated as the explicit source of truth.

Important fix:

- `docs/js/app/menu-scene/builders.js`
  - do **not** auto-fill fallback nodes if explicit `themeMap.nodes` is present

Without this, debugging layout is misleading because deleted nodes silently reappear.

## Board/Connection Notes

### Most important bug class we hit

The biggest recent board bug was **premature schema resolve** for board connectors.

What happened:

- board connector schema was being expanded too early
- runtime `handlers` and `node` bindings were not reliably preserved
- connector DOM existed, but `pointerdown`/dataset bindings could be wrong or missing

Fix applied:

- `docs/js/app/board-scene/view.js`
  - board node view now hydrates the created DOM explicitly
  - connector dataset and event listeners are attached after element creation

- `docs/js/app/board-scene/contracts.js`
  - `assertBoardNodeSchemaContract(...)`

### Rule for board interactive elements

Do **not** rely only on schema listener resolution for critical board interactions.

For board connectors/nodes:

- schema can define structure/classes
- runtime hydration should enforce:
  - `data-id`
  - `data-symbol`
  - `data-node-id`
  - `data-position`
  - `pointerdown`
  - `dragstart`

### Connection creation

Historically the most stable path was the older direct flow:

- temp line via SVG
- final line created directly in SVG
- `redrawConnections(...)`

When refactoring this area:

- preserve a single clear lifecycle
  - `startConnection`
  - `drawTemporaryWire`
  - `finishConnection`
  - `removeTemporaryWire`
- avoid mixing:
  - schema bugs
  - hit-testing changes
  - SVG creation changes
  in the same patch

### Current caution

Connection creation was recently unstable during refactors. Even after multiple fixes, this area should still be treated as sensitive until manually re-verified in-browser.

If touching this area:

1. verify connector `pointerdown`
2. verify temp wire appears
3. verify `pointerup` resolves a target
4. verify final line is appended to `#connections-layer`
5. verify redraw sync keeps the line visible

## Cache-Busting / Browser Reality

This project uses ES modules served from a simple static server.

Practical issue:

- browser module cache can make it look like code changes did nothing

If a fix appears correct in code but not in browser:

- bump query strings in:
  - `docs/index.html`
  - `docs/game.html`
  - `docs/journal.html`
  - `docs/themes.html`
  - `docs/js/main.js`
  - `docs/js/game.js`

Do this carefully and intentionally. Avoid random repeated churn, but do not ignore caching as a debugging variable.

## Where To Change Things

### If changing screen/card/modal UI

Prefer:

- `docs/data/*.schema.json`
- `docs/js/app/*-runtime/content-builders.js`
- `docs/js/app/scene-ui/*`

### If changing menu/home scene visuals

Prefer:

- `docs/js/app/menu-scene/node-schema.js`
- `docs/js/app/menu-scene/renderers.js`
- `docs/js/app/menu-scene/layout-runtime.js`
- `docs/js/app/menu-scene/controller.js`
- `docs/styles/pages/menu.css`

### If changing mix-zone / board mechanics

Prefer:

- `docs/js/app/mechanics/connection-lab/index.js`
- `docs/js/app/board-scene/connection-session-controller.js`
- `docs/js/app/board-scene/drag-session-controller.js`
- `docs/js/app/board-scene/render-controller.js`
- `docs/js/app/board-scene/view.js`
- `docs/js/svg.js`

## Refactor Guidance

### Good

- move working manual logic into named modules
- keep one source of truth per concern
- validate contracts where runtime bugs are expensive
- separate view structure from event hydration for board nodes

### Bad

- mixing CSS sizing and runtime sizing without knowing which wins
- changing coordinates, zoom, fit, and camera in one patch
- resolving schema fragments before runtime bindings are available
- debugging cached browser code as if it were fresh code

## Practical Testing Checklist

After changing menu/home:

1. load `http://localhost:8080/`
2. verify node count matches `menu-map.json`
3. verify node size changes from runtime code really affect DOM
4. verify pager and intro modal still work

After changing board/mix-zone:

1. load `http://localhost:8080/game.html`
2. drag from palette to board
3. drag node around
4. create a bond
5. remove a bond
6. verify tutorial overlay does not break interaction

## Local Repository Notes

- Do not commit:
  - `.codex/`
  - `documentation/Atomic-Smash-Design-Vision.docx`

- Current active architecture branch has been:
  - `kyrylo-karasov/architecture`

## Summary

This codebase is no longer “just DOM code”.

The safest mental model is:

- schema for ordinary UI
- runtime hydration for critical board interactivity
- state/controllers for mechanics
- DOM/SVG as render output, not as implicit logic storage

When in doubt, keep behavior stable first, then raise abstraction second.

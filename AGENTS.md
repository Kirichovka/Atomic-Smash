# AGENTS

## Purpose

This repository is moving from ad-hoc DOM code toward a layered runtime.

Main mental models:

- `data -> state -> controllers -> scene/runtime -> DOM`
- `JSON schema -> validator -> bindings/actions -> scene-ui -> rendered UI`

This file is a practical guide for AI/code agents so changes land in the right layer and do not reintroduce known bugs.

Documentation rule:

- after every meaningful bug fix, regression fix, or architecture change, update `AGENTS.md`
- record:
  - what broke
  - the real cause
  - the fix
  - the safe rule to avoid repeating it

Treat `AGENTS.md` as a living operational document, not as one-time documentation.

## Fast Start

If you need to understand the project quickly, read in this order:

1. `docs/js/game.js`
2. `docs/js/data.js`
3. `docs/js/app/game-runtime/runtime.js`
4. `docs/js/app/menu-scene/controller.js`
5. `docs/js/app/mechanics/connection-lab/index.js`
6. `docs/js/app/board-scene/*`

This gives the shortest path to understanding:

- how data enters
- where the app is assembled
- how ordinary UI is rendered
- how board/mechanic logic is structured

## Top-Level Architecture

### Entry

- `docs/js/game.js`
  - application bootstrap/composition root
  - loads data and runtime schema configs
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

Useful mental model:

- `game.js` starts the app
- `runtime.js` wires the app
- controllers run behavior
- scenes own rendering/layout domains
- mechanics own interaction rules

### Scene UI

- `docs/js/app/scene-ui/*`
  - schema compilation
  - validation
  - primitives
  - action resolution
  - DOM factory

Use this for regular UI, panels, cards, modals, chrome, and screen shells.

If the feature already has:

- runtime schema JSON
- content builder
- controller

do not start by editing raw HTML first.

### Home/Menu Scene

- `docs/js/app/menu-scene/*`
  - scene builders
  - node schema
  - renderers
  - layout runtime
  - controller

This is the structured version of the older hand-written homepage map logic.

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
  - manifest
  - adapters
  - contracts
  - mechanic implementations

Current main mechanic:

- `docs/js/app/mechanics/connection-lab/index.js`

## Change Routing

Use this map before editing:

| Goal | Primary place to change |
| --- | --- |
| Add or change screen shell UI | `docs/data/*.schema.json`, `docs/js/app/*-runtime/content-builders.js` |
| Change modal/card/panel structure | `docs/js/app/scene-ui/*` and runtime schema |
| Change menu/home map rendering | `docs/js/app/menu-scene/*` |
| Change board node or connector DOM | `docs/js/app/board-scene/view.js` |
| Change board drag/connect lifecycle | `docs/js/app/board-scene/*-session-controller.js` |
| Change board persistence or mutations | `docs/js/app/board-scene/mutation-controller.js` |
| Change chemistry rule/evaluation | `docs/js/app/mechanics/connection-lab/index.js` |
| Change low-level SVG helpers | `docs/js/svg.js` |
| Change controller composition | `docs/js/app/game-runtime/runtime.js` |

If uncertain, follow the existing runtime path instead of inventing a new one.

## Current Runtime UI Rule

If a feature is ordinary UI, prefer:

1. runtime schema JSON in `docs/data/*.schema.json`
2. builder/runtime wrapper
3. controller wiring

If a feature is interactive board logic, prefer:

1. `board-scene` controller/session/state layer
2. mechanic orchestration
3. SVG/DOM as a render target, not the source of truth

## Color / Visual System Rule

Use the Atomic Smash palette for shared UI:

- ink: `#073b4c`
- warm accent: `#ffd166`
- active teal: `#118ab2`
- paper: `#fffdf4`

Source of truth:

- `docs/styles/foundation/tokens.css`
- page-specific overrides such as `docs/styles/pages/game.css`

Do not reintroduce purple as the global fallback accent. A previous issue made tutorial buttons inherit the old purple `--color-accent`, which made the `Next` button visually inconsistent with the game UI.

For tutorial actions, prefer the game button style:

- warm yellow background
- dark ink text
- dark border/shadow

## Large Screen Layout Rule

2K/4K displays should not make interactive scenes stretch endlessly across the viewport.

What broke:

- game workspace and board chrome expanded to the full monitor width
- `#mix-zone` used viewport-wide `left/right` offsets, so the board became visually over-wide on large displays
- ordinary shells had fixed max-widths, while scene pages lacked a shared large-screen policy

Current fix:

- shared layout caps live in `docs/styles/foundation/tokens.css`
- large-screen overrides live in `docs/styles/responsive.css`
- menu/home uses `--layout-scene-max-width`
- game workspace uses `--layout-game-workspace-max-width`
- game shell height uses `--layout-game-shell-height` so tall displays do not make the board feel unbounded

Safe rule:

- cap and center scene shells before changing node math
- do not solve 2K/4K layout by editing individual node sizes first
- keep scene data coordinates independent from monitor resolution
- use breakpoints/tokens for density and shell bounds, then only touch JS geometry if the data projection itself is wrong

## Menu Scene Notes

### What controls node size

Home/menu node size is not CSS-width-driven.

Current source of truth:

- `docs/js/app/menu-scene/contracts.js`
- `docs/js/app/menu-scene/entities.js`
- `docs/js/app/menu-scene/renderers.js`

Renderer writes inline width:

- `element.style.width = "...px"`

CSS mainly affects:

- typography
- padding
- border
- shadows
- visual compactness

That means:

- if size looks wrong, inspect inline style first
- CSS width is usually not the real source of truth here

### Important past issue

Node size appeared not to change because:

- `.home-level-node` used percentage padding in CSS
- percentage padding inflated visual size
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
  - do not auto-fill fallback nodes if explicit `themeMap.nodes` is present

Without this, debugging layout is misleading because deleted nodes silently reappear.

### Header bottom anchoring

The home header menu/actions row should sit near the bottom edge of the header shell instead of floating upward.

What broke:

- the menu action row could render too high inside the header card
- the shell then showed empty space under the controls, which made the header look visually off

Real cause:

- the header shell did not reserve a minimum vertical space
- the lower strap row was not set to consume the leftover height in the column layout

Fix applied:

- `docs/styles/pages/menu.css`
  - added `min-height` to `.home-header`
  - added `margin-top: auto` to `.home-header-strap`

Safe rule:

- for menu/home header vertical alignment, prefer fixing the flex layout in `docs/styles/pages/menu.css`
- do not push the row with absolute positioning or one-off inline styles when the shell is already a column flex container

### Menu responsiveness

The menu/index page responsive behavior depends on the header schema and mobile CSS staying aligned.

What broke:

- the header buttons rendered in the top row while the responsive CSS still expected a separate bottom nav row
- on narrow screens the menu shell could also clip content because the page stayed `overflow: hidden` with a fixed viewport-height shell

Real cause:

- `home-chrome.schema.json` drifted away from the two-row header layout that `docs/styles/responsive.css` was written for
- the small-screen shell rules did not switch the menu page back to normal scrolling

Fix applied:

- `docs/data/home-chrome.schema.json`
  - restored the bottom `home-header-nav` row
- `docs/js/app/menu-scene/chrome.js`
  - kept the JS fallback schema consistent with the runtime schema JSON
- `docs/styles/responsive.css`
  - lets the header rows wrap on smaller screens
  - re-enables menu page scrolling and removes fixed-height clipping on narrow screens

Safe rule:

- if the menu header structure changes, update both the runtime schema JSON and the JS fallback in `docs/js/app/menu-scene/chrome.js`
- when making the menu responsive, check shell overflow/height rules first, not only button sizes or spacing

### Header spacing and visual order

The menu header should read in a clear order: brand first, utility action second, route context third, primary navigation last.

What broke:

- header items felt crowded and visually clashed with each other
- the route meta and action buttons did not have enough spacing/balance, so the hierarchy was hard to scan

Real cause:

- the header flex areas did not reserve enough breathing room for each content group
- button widths, row gaps, and wrap behavior were too tight for intermediate viewport widths

Fix applied:

- `docs/styles/pages/menu.css`
  - increased header padding and group spacing
  - gave the brand and route meta clearer flex sizing
  - normalized button widths and internal text spacing
- `docs/styles/responsive.css`
  - keeps tablet layout in two readable rows
  - stacks the header groups more deliberately on narrow screens

Safe rule:

- treat the menu header as four visual groups with explicit spacing contracts
- when header items start colliding, adjust flex basis, gaps, and wrapping before changing copy or using absolute positioning

## Board / Connection Notes

### Most important bug class we hit

The biggest recent board bug was premature schema resolve for board connectors.

What happened:

- board connector schema was expanded too early
- runtime `handlers` and `node` bindings were not reliably preserved
- connector DOM existed, but `pointerdown` and dataset bindings could be wrong or missing

Fix applied:

- `docs/js/app/board-scene/view.js`
  - board node view hydrates created DOM explicitly
  - connector dataset and event listeners are attached after element creation

- `docs/js/app/board-scene/contracts.js`
  - `assertBoardNodeSchemaContract(...)`

### Rule for board interactive elements

Do not rely only on schema listener resolution for critical board interactions.

For board connectors and nodes:

- schema can define structure and classes
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

- preserve a single clear lifecycle:
  - `startConnection`
  - `drawTemporaryWire`
  - `finishConnection`
  - `removeTemporaryWire`
- avoid mixing:
  - schema bugs
  - hit-testing changes
  - SVG creation changes
  in the same patch

Recommended verification order:

1. connector DOM exists
2. connector has `data-node-id` and `data-position`
3. connector `pointerdown` works
4. temp wire appears
5. final line is appended to SVG
6. redraw keeps the final line visible

### First tutorial connection validation

The opening `basic / level-1` tutorial should not force one exact node path when multiple technically correct H2O bonds are possible.

Rule:

- a Hydrogen-to-Oxygen bond is valid
- a Hydrogen-to-Hydrogen bond is invalid for the water tutorial
- duplicate bonds are invalid
- same-node bonds are invalid
- valency-breaking bonds are invalid

Current implementation:

- `docs/js/app/board-scene/connection-session-controller.js`
  - owns connection lifecycle
  - calls optional `validateConnectionAttempt(...)`
  - turns the temporary wire red while hovering over an invalid tutorial target
  - draws a short red rejected line after invalid release

- `docs/js/app/mechanics/connection-lab/index.js`
  - owns the chemistry-specific first-tutorial validation
  - only applies this strict tutorial feedback to `basic / level-1`

- `docs/js/app/game-runtime/basic-tutorial-controller.js`
  - reads `state.ui.basicTutorialConnectionFeedback`
  - explains why the attempted tutorial bond will not work
  - scores tutorial bubble positions against board nodes and SVG lines so the bubble avoids covering active objects when possible

Safe rule:

- keep generic connection lifecycle in `board-scene`
- keep chemistry/tutorial-specific validation in `connection-lab`
- do not hard-code the first tutorial to a single specific node pair if several H-O mappings are valid
- tutorial bubble placement should consider board nodes and existing connections as obstacles, not just the highlighted target

### Current caution

Connection creation has been unstable during refactors. Treat this area as sensitive until manually re-verified in-browser.

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

Do this carefully and intentionally. Avoid random churn, but do not ignore caching as a debugging variable.

If browser behavior and code disagree, suspect cache before suspecting the math.

## Clone / Git For Windows Issues

Known external setup issue:

- `fatal: failed to load library 'libcurl-4.dll'`
- `remote helper 'https' aborted session`
- `LoadLibraryExW() failed with: An Application Control policy has blocked this file`

This is not caused by repository contents. It means the local Windows machine blocked Git for Windows' HTTPS runtime, usually through WDAC, AppLocker, Smart App Control, antivirus policy, or corporate device policy.

Safe rule:

- do not try to fix this by changing repository code or GitHub settings
- document the workaround for contributors
- prefer SSH clone when HTTPS Git is blocked
- reinstall official Git for Windows into `C:\Program Files\Git`
- if policy still blocks it, the device administrator must whitelist the official Git binaries/DLLs

Recommended contributor commands are documented in `README.md` under `Cloning On Windows`.

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

### If changing controller wiring

Prefer:

- `docs/js/app/game-runtime/runtime.js`
- `docs/js/app/game-runtime/controller-contracts.js`
- `docs/js/app/game-runtime/controller-factory.js`

Do not wire one-off controller composition from random feature files if runtime already owns it.

## Refactor Guidance

### Good

- move working manual logic into named modules
- keep one source of truth per concern
- validate contracts where runtime bugs are expensive
- separate view structure from event hydration for board nodes
- keep critical board interactivity explicit when schema ordering is risky

### Bad

- mixing CSS sizing and runtime sizing without knowing which wins
- changing coordinates, zoom, fit, and camera in one patch
- resolving schema fragments before runtime bindings are available
- debugging cached browser code as if it were fresh code
- changing DOM structure and interaction binding together without a browser check

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

If connection logic was touched, also verify:

1. tutorial bond creation still works
2. saved/restored bonds render after reload
3. dragging a node keeps the line attached

## Local Repository Notes

- Do not commit:
  - `.codex/`
  - `documentation/Atomic-Smash-Design-Vision.docx`

- Current active architecture branch has been:
  - `kyrylo-karasov/architecture`

## Summary

This codebase is no longer "just DOM code".

The safest mental model is:

- schema for ordinary UI
- runtime hydration for critical board interactivity
- state/controllers for mechanics
- DOM/SVG as render output, not as implicit logic storage

When in doubt, keep behavior stable first, then raise abstraction second.

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

Current secondary mechanic:

- `docs/js/app/mechanics/balance-lab/index.js`

Balance-lab route integration note:

- what changed:
  - selected ordinary theme levels now use `mechanicId: "balance-lab"` instead of keeping all non-`equations` theme levels on `connection-lab`
  - current ready-theme mix is three balance levels per theme, with the remaining levels staying on connection lab
- real cause:
  - `balance-lab` is registered in the mechanics manifest and data catalog, but it only renders useful gameplay when the active level includes an `equation` block
  - changing only `mechanicId` would activate the mechanic without giving it equation data
- fix:
  - balance-enabled levels in `docs/data/game-data.json` include both `mechanicId: "balance-lab"` and an `equation` object with `parts`, `answers`, and `label`
  - matching entries in `docs/data/level-briefs.json` use `Balance Lab` copy so menu and intro text do not contradict the mechanic
- safe rule:
  - never route a level to `balance-lab` without adding a valid `equation`
  - when switching a level mechanic, update both game data and level brief text together
  - keep theme-level balance/connection proportions intentional, not accidental leftovers from copied levels

Balance-lab mechanic UX note:

- what changed:
  - `balance-lab` now supports dragging coefficient buttons onto blanks, while keeping the original click-to-select flow
  - the panel has local `Reset` and `Check Answer` controls so players do not need the generic mix/clear controls for equation rounds
  - repeated wrong answers can show a hint banner, and right-click/context menu actions can clear or fill blanks
- real cause:
  - the first balance-lab UI depended too much on the shared game controls and a click-only picker
  - PR-style data changes bundled with mechanic fixes can accidentally roll back current level catalogs
- fix:
  - mechanic-only changes were applied in `docs/js/app/mechanics/balance-lab/index.js`
  - matching visual states were applied in `docs/styles/pages/game-balance-lab.css`
  - `docs/data/game-data.json` and `docs/data/menu-map.json` were intentionally not taken from the old PR because they conflicted with current level data
- safe rule:
  - keep balance-lab interaction improvements in the mechanic and its page CSS
  - do not merge old `game-data.json` wholesale just to pick up mechanic fixes
  - after changing balance-lab controls, manually verify click fill, drag/drop fill, reset, check, wrong-answer feedback, and returning to connection-lab levels

Balance-lab progression/navigation note:

What broke:

- equation rounds reused the normal compound-discovery and level-complete flow, so players saw `Discovered Compounds` and a `Stay Here` choice that do not fit equation balancing
- leaving for the Journal could lose filled coefficient blanks because balance-lab did not capture persisted state
- reset could run every mechanic reset path and leave the balance board visually empty

Real cause:

- `balance-lab` rendered inside the shared game shell but did not hide connection-lab-only chrome
- `captureState()` returned `null`, so page navigation saved no equation answers
- the generic clear action called `mechanicsRegistry.resetAll()` instead of resetting only the active mechanic

Fix:

- balance-lab hides `#compound-zone` while active and restores it on deactivate
- balance-lab stores `answers`, `selectedCoeff`, and `wrongAttempts` in `state.board.balanceLab`
- Journal has a `Game` action that resumes the current theme without losing level state
- balance-lab completion skips compound discovery and the level-complete stay/next modal; it opens the next level intro directly
- generic reset clears only the active mechanic
- next-level intro opened from balance-lab does not advance `currentLevelId` until the player starts the next level, so closing the intro keeps the completed balance level visible
- balance-lab `captureState()` does not overwrite saved answers while the mechanic is unmounted on Journal/Menu pages

Safe rule:

- equation balancing is progression content, not compound discovery content
- do not use global mechanic resets for an in-level reset button
- any mechanic with local UI state must mutate persisted state during `captureState()`
- if a mechanic skips the level-complete modal and opens the next intro directly, do not advance `currentLevelId` before the next-level start action
- unmounted mechanics must return their existing saved snapshot from `captureState()`; page navigation should never replace gameplay progress with empty in-memory defaults

Balance-lab help visual note:

- what broke:
  - after repeated failed balance-lab answers, the shared help modal tried to call `createHelpVisual(...)`
  - `balance-lab` did not implement that optional mechanic method, so the promise failed with `createHelpVisual is not a function`
- real cause:
  - `runtime.js` treated an optional mechanic capability as required
  - balance-lab had local hint feedback but no shared modal help visual for the generic failed-attempt path
- fix:
  - `runtime.js` now calls `getActiveMechanic().createHelpVisual?.(...) ?? null`
  - `docs/js/app/mechanics/balance-lab/index.js` provides a compact equation coefficient help visual
  - `docs/js/app/mechanics/manifests.js` marks balance-lab with the help visual capability
- safe rule:
  - never call optional mechanic APIs without optional chaining or a capability check
  - if a shared controller can open a mechanic-specific modal, either every routed mechanic implements the visual contract or the runtime must provide a null-safe fallback
  - when changing mechanic optional methods, bust the runtime/mechanics import chain and the matching page CSS import

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

## Modal Styling Rule

Shared modals should inherit the Atomic Smash visual system without changing their runtime structure.

What broke:

- the level intro modal looked generic compared with the game UI
- PR-style changes attempted to bundle modal restyling with unrelated index/header edits

Real cause:

- modal shell styling still used neutral defaults while the rest of the app used ink, paper, warm accent, and active teal
- broad PRs can accidentally touch page shell structure when only shared modal CSS needs to change

Fix applied:

- `docs/styles/components/modals.css`
  - themes the modal backdrop, dialog, close button, level intro panels, and intro action button with Atomic Smash tokens
- `docs/styles/responsive.css`
  - keeps the level intro modal readable and tappable on small screens
- `docs/index.html`
  - bumps the stylesheet query intentionally after modal CSS changes

Safe rule:

- for modal visual changes, prefer shared CSS in `docs/styles/components/modals.css`
- do not replace `docs/index.html` or add parallel CSS entrypoints just to restyle modals
- preserve `./favicon.ico` and the current runtime menu structure when taking ideas from older PRs

Level intro modal compactness note:

What broke:

- level intro briefings expanded into a near-fullscreen document with four large information panels
- the dialog sat against the viewport edges on large monitors instead of reading as a centered pre-level prompt

Real cause:

- the shared `.modal-dialog` default uses wide `inset` positioning for rich discovery/help modals
- level intro content reused that large shell and rendered theme context, level goal, lesson theory, and mechanic details at once

Fix applied:

- `docs/index.html` marks the level intro dialog with `level-intro-dialog`
- `docs/styles/components/modals.css` and `docs/styles/responsive.css` center and cap the level intro dialog separately from other modals
- `docs/js/app/modal-runtime/content-builders.js` now renders one concise `Goal` panel instead of four briefing panels
- `docs/data/modal-runtime.schema.json` gives level intro content a `level-intro-shell` class for scoped sizing

Safe rule:

- keep level intro as a short centered prompt, not a lesson document
- put deeper theory in journal/help/discovery surfaces, not the pre-level start modal
- do not shrink all `.modal-dialog` instances just to fix level intros

Valency modal compactness note:

What broke:

- valency errors opened as a large explanation modal with both issue details and theory
- the modal reused the broad shared dialog shell, so a simple validation failure felt like a full-screen lesson

Real cause:

- `renderValencyModalContent(...)` appended both the active issue panel and the valency theory panel every time
- `#valency-modal` used the generic `.modal-dialog` sizing instead of a scoped compact dialog class

Fix applied:

- `docs/game.html` marks the valency modal shell with `valency-dialog`
- `docs/styles/components/modals.css` and `docs/styles/responsive.css` center and cap the valency dialog separately
- `docs/js/app/modal-runtime/content-builders.js` now renders a short error summary and only the current invalid atom list
- `docs/data/modal-runtime.schema.json` gives the valency content a `valency-modal-shell` class for scoped sizing

Safe rule:

- keep validation errors short and action-oriented
- do not show theory by default in blocking error modals
- use scoped dialog classes for compact workflow prompts instead of shrinking every shared modal

Centered workflow modal note:

What broke:

- discovery, level-complete, element/help/theme modals reused the broad shared `.modal-dialog` inset shell
- on large screens they looked like full pages pinned near viewport edges instead of centered prompts

Real cause:

- the default modal dialog still used `inset: 40px`, which expands with monitor size
- compound and level-complete content was styled generously, so the oversized shell made simple workflow prompts feel huge

Fix applied:

- `docs/styles/components/modals.css` centers and caps `#compound-modal`, `#level-complete-modal`, `#element-modal`, `#help-modal`, and `#theme-complete-modal`
- compound and level-complete typography, visual cards, and panel spacing were reduced to fit the smaller centered shell
- `docs/styles/responsive.css` preserves centered sizing on small screens instead of falling back to edge-to-edge inset

Safe rule:

- keep workflow modals centered and capped; do not let them stretch to the full 2K/4K viewport
- prefer scoped modal selectors by modal id instead of shrinking every `.modal-dialog`, because level intro and valency already have their own compact shells

Discovery-before-level modal order note:

What broke:

- after completing a level with a newly discovered compound, the `Level cleared` modal opened on top of the compound discovery information
- the player saw the next-level prompt before reading the discovery card

Real cause:

- `board-actions-controller` passed `{ isNewDiscovery }` to `onLevelTargetComplete(...)`
- `progression-controller` already used that flag to queue the level-complete modal after the compound modal closes
- `gameplay-controller` dropped the second `options` argument and called `handleLevelComplete(compound)` only

Fix applied:

- `docs/js/app/game-runtime/gameplay-controller.js` forwards `(compound, options)` into `progressionController.handleLevelComplete(compound, options)`

Safe rule:

- preserve completion metadata between board actions, gameplay, and progression controllers
- when modal ordering depends on a flag, verify the flag is forwarded through every controller boundary

Next-level briefing order note:

What broke:

- pressing `Next Level` in the level-complete modal started the next task immediately
- the player skipped the next level's intro/briefing information

Real cause:

- `progression-controller` wired the level-complete `onAdvance` handler directly to `startTheme(currentTheme.id)`
- that reused progression state correctly, but bypassed `modalController.openLevelIntroModal(...)`

Fix applied:

- `docs/js/app/game-runtime/progression-controller.js` now opens the next level intro modal from `onAdvance`
- the level starts only when the player uses the action inside the intro modal

Safe rule:

- level transitions should go `discovery info -> level complete prompt -> next level intro -> start level`
- do not call `startTheme(...)` directly from the level-complete next button unless intentionally skipping briefings

Level-complete stay state note:

What broke:

- after completing a connection-lab level, closing the level-complete modal left the visible board on the completed compound but `currentLevelId` already pointed at the next level
- pressing `Mix` again evaluated the old board against the next level target

Real cause:

- `handleLevelComplete(...)` advanced `currentLevelId` before opening the level-complete modal
- the modal close/Stay path only closed UI and did not restore the active level id

Fix applied:

- the level-complete `onStay` handler restores `state.progress.currentLevelId` to the completed level id, refreshes meta/current/discovery views, and persists without recapturing the board

Safe rule:

- if progression advances state before a confirmation modal, every cancel/stay/close path must restore the previous active level
- do not let visible board state and `getCurrentLevel(...)` drift apart

Completed-level replay note:

What broke:

- clicking a completed menu level opened its intro, but starting it did not replay that completed level
- the game instead resolved the active task from the first incomplete level in the theme

Real cause:

- progress only stored `currentThemeId`; `getCurrentLevel(...)` derived the active level from incomplete progress
- `openLevelIntroModal(...)` passed the selected level to the intro UI, but the start action called `startTheme(theme.id)` without the selected level id

Fix applied:

- progress now stores `currentLevelId`
- `getCurrentLevel(...)` returns `currentLevelId` when it belongs to the current theme, even if it is already completed
- level intro start actions call `startTheme(theme.id, { levelId })`
- completed level intro copy says `Replay Level`

Safe rule:

- do not derive active gameplay level only from completion state when users can replay completed tasks
- menu preview actions must preserve selected `level.id` all the way through modal start and progression start
- when changing active-level resolution, update persisted state hydration/snapshot and cache-bust every module importing `state.js`

Tutorial-gated next-level note:

What broke:

- on the first tutorial level, pressing `Next Level` could try to advance while post-level tutorial hints still needed to be shown
- the next level flow felt stuck or out of order because tutorial completion and level advancement were separate actions

Real cause:

- the level-complete `Next Level` handler opened the next level intro immediately
- `basic-tutorial-controller` had post-level stages, but no callback queue for "continue after all tutorial hints"

Fix applied:

- `docs/js/app/game-runtime/basic-tutorial-controller.js` now supports `runAfterPostLevelHints(...)`
- `docs/js/app/game-runtime/progression-controller.js` uses that queue for the first tutorial level before opening the next level intro
- `docs/js/app/game-runtime/board-actions-controller.js` suppresses immediate discovery modals for target compounds so progression can order `tutorial hints -> discovery modal -> level complete modal`
- `docs/js/app/game-runtime/progression-controller.js` falls back to the normal modal flow if the tutorial continuation callback is unavailable, so `Next Level` never becomes a no-op
- `docs/game.html` includes `#level-intro-modal`, because next-level intro can now be opened from inside the game screen
- `docs/js/app/game-runtime/runtime.js` treats level-intro modals as tutorial-overlay blockers

Safe rule:

- tutorial level advancement should wait for post-level tutorial hints to finish
- for target compounds, let progression own modal sequencing; do not open discovery modals directly from board action flow
- any page that can call `openLevelIntroModal(...)` must include the level intro modal DOM shell
- when a tutorial flow gates navigation, put the continuation in the tutorial controller instead of starting the next level directly
- when changing nested ES module behavior, bump every import URL in the chain; stale nested modules can preserve old `Next Level` behavior even when page HTML has a fresh query string

Game-to-menu navigation flicker note:

What broke:

- pressing `Menu` from a balance-lab level could briefly show the ordinary game palette/topbar before the browser landed on the menu page

Real cause:

- `openMainMenu()` deactivated the active mechanic before cross-page navigation
- `balance-lab.deactivate()` restores shared game controls and removes its panel, so one frame of the underlying connection-lab-style shell could paint before `window.location.assign(...)`

Fix applied:

- `docs/js/app/game-runtime/progression-controller.js` now navigates immediately when the current HTML page is not already the destination page
- current-page context is passed from runtime into gameplay/progression so same-page rendering can still deactivate and render normally

Safe rule:

- for cross-page navigation, start navigation/persistence before tearing down page-specific mechanics
- only deactivate and re-render mechanics in place when staying on the same HTML page
- verify balance-lab navigation because it hides/restores shared controls during activate/deactivate

Mix result toast note:

What broke:

- transient mix feedback such as `Unknown compound.` rendered as a wide topbar field
- the message looked like permanent chrome instead of temporary feedback

Real cause:

- board mix actions wrote directly into `refs.result.textContent`
- `#result` was styled as a flex item inside the topbar, so every short status inherited the topbar layout

Fix applied:

- `docs/js/app/game-runtime/board-actions-controller.js` uses a timed result toast helper for mix feedback
- `docs/styles/pages/game.css` styles `#result` as a fixed centered popup card
- `docs/styles/responsive.css` keeps the toast constrained on smaller screens

Safe rule:

- use temporary toast behavior for short mix feedback
- keep persistent progress/state in the topbar, not transient error text
- clear toast timers when replacing or clearing feedback

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

### Menu map auto-fit

The menu scene should calculate its visible layout from node bounds instead of hand-tuning individual level coordinates for each viewport.

What broke:

- lower route nodes, especially capstone nodes such as `so-level-16`, could sit with their center near the bottom edge of the stage
- because node radius was not included in the camera range, the bottom half of the node and its incoming lines could be clipped

Real cause:

- `x`/`y` coordinates from `menu-map.json` were projected directly into viewport percentages
- the layout range came from CSS `--home-map-overflow`, while actual node size, locked-node scale, and map bounds were not included in the fit calculation

Fix applied:

- `docs/js/app/menu-scene/entities.js`
  - `MenuSceneSpace` now computes node and edge-path bounds, fit scale, offsets, virtual height, and overflow from the actual sheet
- `docs/js/app/menu-scene/layout-runtime.js`
  - camera range now comes from computed layout overflow instead of raw CSS overflow
- `docs/js/app/menu-scene/renderers.js`
  - node positions are rendered in fitted pixels after projection

Safe rule:

- do not fix edge clipping by moving one node in `menu-map.json` unless the route itself is wrong
- first verify the computed node bounds, edge bounds, scale, and virtual height in `MenuSceneSpace`
- keep `menu-map.json` as route design data and let runtime fit it to the viewport

### Menu unlocked-node spacing

What broke:

- completed/current levels grew to their unlocked runtime size and began overlapping lower locked nodes in the same route column
- the issue was most visible after several levels were completed, because the stored `menu-map.json` centers stayed fixed while rendered node radii changed

Real cause:

- `MenuSceneSpace.updateLayout(...)` used actual node radii for outer bounds but still projected each node from the original percentage coordinates
- there was no spacing pass between map data and viewport projection, so state-driven size changes could invalidate the original center distances

Fix applied:

- `docs/js/app/menu-scene/entities.js` now creates a spaced raw-node layout before bounds and projection
- nodes in the same visual column are pushed downward when their center distance is smaller than both radii plus the configured gap
- `project(...)` reads the adjusted positions so nodes and edge paths stay aligned

Safe rule:

- do not solve completed-node overlap by shrinking completed nodes or editing individual route coordinates
- keep size/state decisions on the node entity, then let `MenuSceneSpace` recalculate spacing from the actual radii
- when changing menu node sizes, verify completed/open/locked mixes, not only the fresh locked route

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

### Modal theming

Shared modals should inherit the Atomic Smash look through palette, borders, and button treatment even when their structure stays unchanged.

What broke:

- the level intro modal felt visually generic compared with the rest of the game

Real cause:

- the base modal shell and intro panels leaned on neutral defaults instead of the project’s ink, paper, warm accent, and teal accent system

Fix applied:

- `docs/styles/components/modals.css`
  - rethemed the modal shell, close button, panel cards, and action button around the Atomic Smash palette
- `docs/styles/responsive.css`
  - tuned the same modal styling for smaller screens

Safe rule:

- when restyling shared modals, prefer thematic changes in shared CSS before changing runtime structure
- keep the Atomic Smash palette central: ink `#073b4c`, warm accent `#ffd166`, active teal `#118ab2`, paper `#fffdf4`

## Board / Connection Notes

### Generated chemistry validation

What changed:

- connection-lab now has a generated chemistry fallback after known compound matching
- if a board does not match a catalog compound, `docs/js/app/mechanics/connection-lab/chemistry-engine.js` checks graph connectivity and simplified valency saturation, then can produce a generated formula/classification

Real cause:

- catalog-only matching made every uncatalogued but chemically plausible structure read as `Unknown compound`
- this blocked the sandbox from feeling like a chemistry model once players moved beyond the fixed level list

Fix applied:

- `docs/js/app/mechanics/connection-lab/evaluation.js` still checks catalog compounds first
- only no-candidate boards fall through to `evaluateGeneratedChemistry(...)`
- generated compounds show toast feedback but are not added to the journal and do not complete levels
- invalid generated structures return a concrete reason such as disconnected atoms or unsatisfied valency

Safe rule:

- known catalog compounds must remain the progression/discovery source of truth
- generated chemistry is sandbox feedback, not level completion or journal discovery, unless a later feature explicitly adds generated journal entries
- keep valency/generic chemistry rules in `chemistry-engine.js`; do not spread heuristic chemistry across runtime controllers

### Mobile connection-lab note

What broke:

- phone layout reused the desktop connection-lab assumptions too closely
- tutorial copy emphasized dragging from the palette even though mobile players mostly use element selection plus the `Add` button
- the mobile game shell spent too much space on text/chrome and too little on the connection board
- landscape phones did not get a compact desktop-like layout with palette/actions around a large board

Real cause:

- `palette.js` auto-added elements on coarse-pointer tile taps, bypassing the explicit add button
- `basic-tutorial-controller.js` did not distinguish compact/coarse devices when choosing tutorial targets and copy
- responsive game CSS stacked the sidebar/topbar/compound panels as a scrolling page instead of preserving an app-like board workspace

Fix applied:

- mobile palette taps now select an element; `Add H` / `Add O` places the selected atom
- compact tutorial stages point players to tap the element row first and then use the Add button
- mobile portrait CSS reduces chrome text, hides secondary element detail, keeps the board in the main flexible area, and compresses discovered compounds
- mobile landscape CSS uses a compact PC-like shell: elements on the left, actions on the right, board in the large center area

Safe rule:

- connection-lab mobile hints should describe the primary mobile flow: select element, press Add, connect on the board, then Mix
- do not spend vertical mobile space on secondary explanatory panels when the board needs room for connections
- for landscape phones, prefer a compact app shell over the portrait stacked layout
- keep mobile interaction changes in palette/tutorial/runtime CSS; do not fork connection-lab chemistry evaluation for layout issues

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

Tutorial bubble chrome-overlap note:

What broke:

- the post-mix tutorial bubble could overlap the top panel while explaining where mix results appear
- the highlighted result area was visible, but the instructional bubble sat over persistent chrome

Real cause:

- tutorial bubble scoring considered board nodes and SVG connection lines as obstacles
- it did not include fixed game chrome such as `#topbar`, controls, or sidebar in the obstacle set

Fix applied:

- `docs/js/app/game-runtime/basic-tutorial-controller.js` adds topbar, controls, and sidebar rectangles to tutorial placement obstacles with higher weight

Safe rule:

- tutorial placement must avoid persistent chrome as well as board objects
- when adding tutorial targets near topbar/sidebar/controls, include those UI areas in obstacle scoring before hand-tuning a single placement

Tutorial bubble target-overlap note:

What broke:

- tutorial bubbles and small highlight labels could overlap the atom/connector they were explaining
- primary and secondary connector labels could crowd each other during the first H-O connection tutorial
- the balance-lab sheet description showed a mojibake dash instead of readable punctuation
- the post-mix tutorial still described results as appearing in the top panel after mix feedback had moved to a toast
- after the result toast faded out, the post-mix tutorial could still highlight the invisible `#result` element and show a blank white rectangle

Real cause:

- tutorial bubble placement avoided chrome, nodes, and lines, but did not score overlap with the active target itself
- the data string in `game-data.json` already contained a damaged character sequence

Fix applied:

- `docs/js/app/game-runtime/basic-tutorial-controller.js` treats the active tutorial target as a high-weight placement obstacle and removes the inside-target fallback position
- post-mix tutorial copy now describes the result popup instead of old topbar behavior
- `docs/styles/pages/game.css` tightens tutorial bubble width and raises highlight labels away from small connectors
- secondary connector labels render below the target highlight, while the bubble stays above labels
- the first connection tutorial relies on highlight rings plus the arrow instead of tiny connector labels
- post-mix tutorial targeting now only uses `#result` while the toast has `.is-visible`; otherwise it falls back to the Mix button
- `docs/data/game-data.json` replaces the damaged dash in the balance-lab sheet description

Safe rule:

- tutorial bubbles should never sit inside or directly on top of the target highlight
- keep labels above small connector targets with enough vertical clearance
- for two-connector tutorial steps, offset primary and secondary labels in opposite directions instead of stacking both above their targets
- if connector labels still compete with the tutorial bubble, prefer the ring/arrow cue over adding more label positioning rules
- do not target toast DOM by text alone; hidden toast elements can keep text after they are no longer visible
- when correcting visible copy stored in JSON, cache-bust the data/module chain as well as the page entrypoint

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

Journal element cache-busting note:

What broke:

- after merging fresh `main`, the journal could appear without the expected periodic element library even though `game-data.json` and `element-reference.json` contained element data

Real cause:

- only some page-level stylesheet/script query strings were bumped
- `docs/js/main.js` still imported an older `game.js` URL, and `docs/js/game.js` still imported older `data.js`/runtime URLs
- ES module caching can keep stale nested modules alive even when the top-level HTML file changes

Fix applied:

- bumped cache query strings consistently in `docs/index.html`, `docs/game.html`, `docs/journal.html`, `docs/themes.html`, `docs/js/main.js`, `docs/js/game.js`, and the journal CSS import in `docs/styles.css`

Safe rule:

- when a merge changes data normalization, screen runtime rendering, or page-specific CSS, bust the full import chain, not just the page HTML
- for journal regressions, verify `state.catalog.elements.length` before editing data; if it is populated, suspect stale module/CSS cache first

Journal periodic tile compactness note:

What broke:

- element names inside small periodic-table tiles could clip, for example `Hydrog` under the `H` symbol
- atomic numbers could visually crowd the centered symbol

Real cause:

- the periodic table tile tried to fit number, symbol, and element name into a square that is intentionally small on dense layouts
- CSS hid the name visually in one state, but the renderer still created the name node and the tile grid reserved too much structure for it

Fix applied:

- `docs/js/app/screen-runtime/content-builders.js` no longer renders `periodic-tile-name` inside table tiles
- `docs/styles/pages/journal.css` positions the atomic number in the top-left corner and centers the symbol
- `docs/styles/responsive.css` hides atomic numbers on tablet/mobile widths where they compete with two-letter symbols

Safe rule:

- periodic-table tiles should show only atomic number and symbol; keep full names in preview cards/modals
- on tablet/mobile widths, prefer hiding the atomic number over letting it overlap the symbol
- if tile content feels cramped, simplify the tile content before shrinking fonts or allowing clipped labels

Journal periodic tile type-color note:

What broke:

- locked/reference periodic-table tiles all appeared gray, so element category colors were not visible in the journal table

Real cause:

- tile color variables were scoped to `.periodic-tile.unlocked.tone-*`
- `.periodic-tile.locked` overrode the accent/soft colors with neutral grays

Fix applied:

- `docs/styles/pages/journal.css` applies `tone-*` color variables to all periodic tiles
- locked tiles keep category color, but use a dim overlay/opacity and darker mixed text colors to communicate locked state

Safe rule:

- do not make locked/reference journal tiles globally gray if the table is meant to communicate element type; dim them while preserving the category hue
- keep lock state separate from chemical category color

Journal equation-reference note:

What changed:

- journal periodic-table preview cards now show equation-use data instead of only encyclopedia copy
- preview cards include period/group, common ions, valency, electronegativity, and a short balancing hint
- element detail modals now lead with equation-reference fields before general physical properties

Real cause:

- balance-lab players need the kind of information they would get from a real periodic table while solving equations
- the old preview emphasized everyday uses and locked/unlocked status, which did not help choose coefficients or predict formulas

Fix applied:

- `docs/js/app/screen-runtime/content-builders.js` derives compact equation-reference facts from element metadata and table position
- `docs/js/app/modal-runtime/content-builders.js` shows common ions, valency, electronegativity, and equation use in the element modal
- `docs/js/data.js` carries electronegativity from `element-reference.json`
- `docs/styles/pages/journal.css` adds dense fact chips and a balancing note to the preview card

Safe rule:

- journal element previews should prioritize gameplay-useful chemistry over flavor text
- keep periodic-table-derived hints in screen/modal builders unless the catalog gains explicit per-element equation-reference fields
- after changing journal data presentation, bust the data -> runtime -> screen/modal import chain and the page CSS

Journal compound carousel note:

What changed:

- compound history now renders as a compact horizontal carousel instead of an endlessly growing grid
- the visible desktop area is capped at a 3x2 set of cards, with additional discoveries scrolling horizontally
- compound cards are smaller only inside `#journal-compound-list`, leaving periodic-table element cards unaffected

Real cause:

- the discovered-compound grid grew vertically and pushed the periodic table/reference content too far down
- the large discovery cards were useful as modal entry points but too heavy for a journal overview

Fix applied:

- `docs/styles/pages/journal.css` scopes carousel layout and compact card sizing to `#journal-compound-list`
- scroll snapping keeps the list usable without adding new runtime controls

Safe rule:

- keep compound-history density scoped to the compound list; do not shrink all `.journal-card` instances globally
- journal overview should prioritize the periodic table/reference panel, with discoveries available as a compact history strip

Favicon merge hygiene note:

What broke:

- a feature branch added a new favicon as root-level files with spaces in their names and changed page links to `../favicon (2).ico`
- one page could also end up with two favicon links after a merge

Real cause:

- the deployed `docs` folder expects stable page-local asset paths
- taking branch HTML changes wholesale can overwrite current cache-busting URLs and point pages outside the docs root

Fix applied:

- the new icon was copied into `docs/favicon.ico`
- the SVG source was kept as `docs/favicon.svg`
- page HTML kept the stable `./favicon.ico` link and current stylesheet/script cache-busting URLs
- duplicate root favicon files with spaces were removed from the merge result

Safe rule:

- keep public page assets under `docs/` and reference favicon as `./favicon.ico`
- do not use root-level favicon filenames with spaces in HTML
- when merging favicon work, preserve current cache-busting query strings and check every page has only one favicon link

Menu render cache-busting note:

What broke:

- the menu could still show old task-node hover/size behavior after the newer auto-fit renderer existed in code
- node hover looked like the historical inflated-node bug, and menu scaling/panning could feel like the older inline controller renderer

Real cause:

- `styles.css` imported `styles/pages/menu.css` without a query string, so browsers could keep the old padding-based node CSS
- several nested menu-scene ES module imports also had no fresh query string, so `layout-runtime`, `renderers`, `node-schema`, and `methods` could be mixed with stale cached versions

Fix applied:

- bumped `docs/index.html`, `docs/styles.css`, `docs/js/main.js`, `docs/js/game.js`, runtime imports, and the full menu-scene import chain with `20260509-menu-render-cache`

Safe rule:

- when changing menu rendering, spacing, hover behavior, or scene projection, bust both the page CSS import and every nested menu-scene ES module in the chain
- if browser visuals look like old menu math while source code is correct, inspect loaded URLs/cache before rewriting layout logic

Menu level-entry cache-busting note:

What broke:

- after the mobile connection-lab/menu work, a browser could keep an older menu entry module and level buttons appeared to do nothing or not reach the game screen

Real cause:

- `game.html` and the shared `main.js -> game.js` path had fresh query strings, but `index.html` and nested menu/runtime imports still referenced older cache keys
- ES module cache can mix a fresh page shell with stale `navigation` or `menu-scene` code when only part of the import chain is busted

Fix applied:

- bumped `docs/index.html`, `docs/game.html`, `docs/js/main.js`, `docs/js/game.js`, `docs/js/app/game-runtime/runtime.js`, `docs/js/app/navigation.js`, and the nested menu-scene import chain with `20260512-level-entry-cache`

Safe rule:

- when a bug report says level buttons no longer open levels right after menu/runtime changes, verify the actual click path in-browser and then check cache keys before changing action wiring
- keep `index.html` and `game.html` on the same shared app cache key when `main.js`, runtime, navigation, menu-scene, palette, or tutorial modules change

Mobile menu pan/tap suppression note:

What broke:

- on touch devices, tapping a level after panning or zooming the route could appear to do nothing

Real cause:

- menu pan/zoom used a single `suppressNextClick` flag to block the synthetic click after a drag
- the flag stayed active until any future click inside the stage, so a real tap after a previous gesture could be swallowed

Fix applied:

- `docs/js/app/menu-scene/layout-runtime.js` now suppresses only clicks that happen near the gesture endpoint and within a short time window
- cache-busted the menu entry chain with `20260512-menu-touch-click`

Safe rule:

- never leave drag-click suppression as an unbounded boolean in touch navigation surfaces
- suppression should be scoped by time and pointer position so later taps on level buttons still activate normally

Menu interactive pointer-capture note:

What broke:

- on desktop, level buttons could look clickable but mouse clicks did not open the level intro

Real cause:

- the menu stage pan/zoom controller called `setPointerCapture(...)` on the stage for every pointerdown inside the stage, including pointerdown events that started on real buttons
- that let the pan surface compete with the button's native click flow

Fix applied:

- `docs/js/app/menu-scene/layout-runtime.js` ignores pointerdown events that start on interactive descendants such as buttons and links
- cache-busted the menu entry chain with `20260512-menu-interactive-click`

Safe rule:

- pan/zoom containers should not capture pointers that begin on buttons, links, form controls, or explicit interactive roles
- keep background gestures and UI activation paths separate before tuning click suppression

Menu level-node delegated activation note:

What broke:

- level buttons could be present, visible, and enabled, but clicks still failed to open the level intro on some desktop/mobile input paths

Real cause:

- menu level activation relied on per-node schema listeners only
- when pointer gesture handling, browser coordinate clicks, or stale listener resolution disagreed, the critical `previewLevelIntro` action had no runtime hydration fallback

Fix applied:

- `docs/js/app/menu-scene/controller.js` now delegates clicks from `refs.menuLevelMap` to the current sheet node by `data-level-id`
- the delegated handler calls `onPreviewLevelIntro(...)` directly for unlocked nodes and stops the schema listener path from double-firing
- cache-busted the menu entry chain with `20260512-menu-delegated-click`

Safe rule:

- for menu level entry, keep `data-level-id` plus a runtime delegated activation handler as the reliable path
- schema listeners can describe UI actions, but critical scene navigation should also be hydrated at the scene controller boundary

Petra splash cache-busting note:

What broke:

- Petra's entry splash animation was already merged, but browsers could keep loading older splash CSS/JS because the splash query strings stayed on an older menu cache key

Real cause:

- `docs/index.html` loaded `docs/js/splash.js` with the old `20260509-menu-render-cache` key
- `docs/styles.css` imported `docs/styles/pages/splash.css` with the same old key

Fix applied:

- bumped `docs/index.html` stylesheet/script cache keys and the `docs/styles.css` splash import to `20260513-petra-splash-cache`

Safe rule:

- when taking splash/entry-animation changes from a branch, bump both the page script URL and the nested CSS import
- do not assume a merged animation is visible in-browser until the page-level and imported asset cache keys both changed

Splash entry-only behavior note:

What broke:

- the Petra splash animation appeared again when returning to the menu from another app page

Real cause:

- `docs/js/splash.js` treated every load of `index.html` as a fresh site entry
- internal navigation from `game.html` to `index.html` reloads the menu page, so the splash mounted again even though the user was already inside the app

Fix applied:

- `docs/js/splash.js` stores `atomicSmashSplashSeen` in `sessionStorage` after the intro starts
- the splash also skips immediately when `document.referrer` is from the same origin
- `docs/index.html` cache-busts `splash.js` with `20260513-entry-only-splash`

Safe rule:

- entry splash should be session-scoped, not page-load-scoped
- internal same-origin navigation must reveal the menu immediately and remove the splash DOM

Palette tile button note:

What broke:

- on desktop input paths, palette elements could be visible but unreliable to click/select

Real cause:

- palette element tiles rendered as generic containers with a delegated click listener on the list
- touch taps could still work, but mouse/browser activation had no native button semantics or stable accessible click target

Fix applied:

- `docs/data/palette-runtime.schema.json` renders `paletteTile` as a `button` with an `aria-label`
- `docs/js/data.js` cache-busts the palette runtime schema with `20260512-palette-tile-button`

Safe rule:

- selectable UI tiles should be real buttons when they trigger app state
- keep delegated palette logic for shared state handling, but do not make users click anonymous containers

Menu hover selection rollback note:

What broke:

- a feature branch added broad hover styling to ordinary buttons and game chrome
- menu-node hover/current experiments also made task nodes look selected when they were only hovered or current
- these visual hover transforms could interfere with game-board selection expectations, especially around shift-selection workflows

Real cause:

- the branch changed global `button:hover` behavior and several page-level button/card hover transforms
- hover styling was treated like selection styling instead of staying scoped to surfaces that truly need hover feedback

Fix applied:

- removed the broad Petra hover additions from base, game chrome, cards, screens, and the duplicate modal close rule
- removed menu task hover fill/transform changes
- bumped imported CSS cache keys so old hover rules are not kept by the browser

Safe rule:

- do not implement hover as selection on menu nodes or board-adjacent controls
- keep game-board selection visual state owned by `.node.selected` and board-scene state, not global button/card hover CSS
- avoid broad `button:hover` transforms because buttons also participate in runtime/game workflows
- menu task and menu chrome hover may use scoped, subtle affordances only; do not use saturated fill or transform movement
- locked menu tasks should use schema-owned `aria-disabled` plus a controller click guard when they still need hover feedback
- disabled menu actions such as `Continue` must be disabled by navigation/controller state, then styled via `:disabled`
- `Continue` should be enabled from the viewed route's completed-level count, not from unrelated global progress

Game action hover note:

What broke:

- after removing broad Petra hover rules, several real action buttons had no useful hover feedback
- affected surfaces included palette add, sidebar hide, topbar menu/journal/mix/clear, level intro actions, and level-complete actions

Real cause:

- the bad hover rollback correctly removed global `button:hover`, but some legitimate game chrome did not have scoped replacement states

Fix applied:

- `docs/styles/pages/game.css` adds scoped hover/focus-visible states for game chrome and palette action buttons
- `docs/styles/components/palette.css` strengthens the sidebar toggle hover
- `docs/styles/components/modals.css` adds scoped hover/focus-visible states for level intro and level-complete actions

Safe rule:

- add hover behavior to named game/modal action classes, not global `button:hover`
- keep hover as a subtle affordance; reserve movement/pressed offset for `:active`
- cache-bust `styles.css` and the specific imported CSS file when changing visible hover behavior

Board multi-select modifier note:

What broke:

- multi-node board selection could be confused with hover/selection styling changes, and `Shift` selection was not accepted by the board drag session

Real cause:

- visual hover CSS was introduced outside the board selection state path
- board toggle selection only checked `Ctrl`, even though users may use `Shift`/platform modifiers for multi-select workflows

Fix applied:

- `docs/js/app/board-scene/drag-session-controller.js` toggles node selection from `Shift`, `Ctrl`, or `Meta/Cmd`
- README interaction docs now describe the accepted multi-select modifiers

Safe rule:

- board multi-select must be implemented in `board-scene` selection/drag controllers
- do not attempt to emulate selected/hovered board state with global CSS selectors

Schema-vs-CSS audit note:

What to watch:

- CSS should define how named classes look, not decide which runtime state an element is in
- schema JSON should define ordinary UI structure, class names, attributes, dataset hooks, and actions
- controllers/builders should bind state into schema classes such as `selected`, `active`, `locked`, `current`, `tone-*`, or mechanic-specific state classes

Current safe examples:

- menu task nodes get `level-size-*` and `level-status-*` through `docs/data/menu-scene.schema.json` and `menu-scene/node-schema.js`
- board nodes get schema structure from `docs/data/board-runtime.schema.json`, while `.node.selected` is applied only by `board-scene` state
- palette tiles get `element-template selected` through `palette-runtime` bindings, not through hover CSS
- mix-zone context actions/options get `active` through controller-rendered schema bindings

Current migration candidates:

- `docs/js/app/screen-runtime/content-builders.js` still hand-builds the periodic table, preview card, row labels, `tone-*`, `locked`, and `unlocked` classes; move that structure into `screen-runtime.schema.json` when touching journal table behavior
- `docs/js/app/modal-runtime/content-builders.js` still hand-builds level-complete panels and several compound/element sub-panels; prefer adding modal schema definitions for repeated panel/pill/action shapes before changing their CSS
- `docs/js/app/mechanics/balance-lab/index.js` and `docs/js/equation-balancer.js` still build mechanic UI with template strings and direct state classes; when refactoring these mechanics, route panel/buttons/blanks through mechanic-local schema/bindings instead of adding more CSS-only state rules
- static page header/action buttons on `themes.html`, `journal.html`, and `equation-balancer.html` remain outside runtime schema; move them only as part of a page-shell runtime pass, not as one-off CSS changes

Safe rule:

- before adding a selector for `.active`, `.selected`, `.locked`, `.current`, `.wrong`, `.correct`, `.drag-over`, or `tone-*`, first identify the controller/builder/schema path that owns that state
- if the element is ordinary UI and already has a schema config, add or bind the class in JSON/bindings first, then style the class in CSS
- keep geometry, animation, SVG coordinates, and canvas/SVG drawing in mechanics/renderers where schema cannot express them cleanly

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

### Mobile menu pan/zoom note

What broke:

- on small screens, the home route map stopped behaving like a scene
- level nodes rendered as a vertical CSS grid, route lines were hidden, and the player could not pan/zoom around the level sheet
- strong horizontal swipes on the mobile map could still change the active theme sheet instead of only panning the current sheet
- route nodes could show formula-style briefing titles such as `H2CO3` instead of player-readable compound names
- after switching node titles to compound names, longer labels could overflow the circular level nodes on small screens
- allowing emergency word breaks made long names fit by splitting words across lines, which looked broken on level nodes

Real cause:

- the `max-width: 640px` responsive rules bypassed `menu-scene` projection by making `.home-level-map` relative/grid and `.home-level-node` relative
- the camera only supported vertical wheel offset, so touch pan, horizontal pan, and pinch zoom had no runtime state to update
- `navigation.js` had an older stage-level swipe gesture that interpreted horizontal pan as theme navigation
- `createSceneNodeTitle(...)` preferred `level-briefs.json` `nodeTitle` over the compound catalog name, and many briefs used formulas as compact labels
- node typography was fixed by state/size class, so it did not react to actual projected node width or title length
- `overflow-wrap: anywhere` hid overflow by breaking words instead of forcing the renderer to shrink text

Fix applied:

- `docs/js/app/menu-scene/entities.js` gives `MenuSceneCamera` pixel X/Y offsets and zoom with clamped camera bounds
- `docs/js/app/menu-scene/entities.js` also runs row spacing so same-row nodes do not overlap after mobile projection
- `docs/js/app/menu-scene/layout-runtime.js` binds wheel pan, ctrl/meta-wheel zoom, pointer drag, and two-finger pinch zoom
- `docs/js/app/navigation.js` no longer binds stage swipe-to-theme gestures; sheet changes stay on explicit arrow/dot controls
- `docs/js/app/menu-scene/methods.js` now prefers `compound.name` for route node titles and only falls back to briefing/formula text when catalog data is missing
- `docs/js/app/menu-scene/renderers.js` sets per-node text sizing CSS variables after projection, and `docs/styles/pages/menu.css` lets labels wrap inside the node
- node labels now keep words intact by default; the renderer measures title/subtitle overflow after layout and reduces font size when a word or line would not fit
- mobile CSS keeps the map as an absolute scene viewport and leaves edge rendering enabled

Safe rule:

- do not turn the mobile menu map into CSS grid/list layout unless intentionally replacing the scene renderer
- do not fix same-row mobile overlap by editing individual level coordinates first; add spacing in `MenuSceneSpace` so edge paths and nodes share the adjusted positions
- keep pan/zoom in the menu-scene camera/runtime layer, not in ad-hoc DOM scroll offsets
- do not bind broad swipe navigation on the same surface that owns pan/zoom
- route node labels should prefer player-readable catalog names over formulas; use formulas as fallback or detail text, not the primary node title
- when node title length changes, adjust text fitting in the renderer/CSS variable layer instead of hard-coding one-off font sizes in data or schema
- do not use `overflow-wrap: anywhere` as the normal solution for route node labels; shrink the text before allowing words to break
- when changing nested menu-scene modules, cache-bust the full `index.html -> main.js -> game.js -> runtime.js -> navigation.js -> menu-scene` import chain

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

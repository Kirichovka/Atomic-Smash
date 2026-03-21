# Atomic Smash

Atomic Smash is a small educational chemistry game built as a GitHub Pages project. The player learns through interaction: pick elements, place them on the board, connect them into molecules, and discover compounds through short themed challenges.

The project is now organized not only as a single game, but as a foundation for future mini-games. Navigation, palette UI, progression, persistence, and board mechanics are separated so different teammates can work in parallel without constantly colliding in the same files.

## Product Idea

The core idea of Atomic Smash is to teach basic chemistry through construction and experimentation instead of static quizzes.

The player:
- chooses a theme;
- enters a game screen with a target objective;
- selects elements from a palette;
- places atoms on the board;
- connects them with lines;
- presses `Mix`;
- gets either a discovery, a failure, or a visual hint after repeated mistakes.

The app combines three goals:
- make chemistry feel tactile and playful;
- create a structure that can grow into multiple mini-games;
- keep the codebase easy to split between teammates.

## Current Experience

The current version is built around a page-per-screen flow:

- `Menu` introduces the game and opens the main entry points.
- `Themes` shows progression and lets the player select a challenge set.
- `Game` hosts the active mechanic and objective.
- `Journal` stores discovered compounds and unlocked information.

The game loop is intentionally short:

1. Pick a theme and level.
2. Build the target compound on the board.
3. Validate it through the active mechanic.
4. Unlock progress and continue to the next challenge.

## Current Mechanics

### Main mechanic: `connection-lab`

The current gameplay mechanic is internally named `connection-lab`.

It is responsible for:
- spawning atoms onto the board;
- dragging atoms to reposition them;
- drawing connections between atoms;
- evaluating whether the placed set of atoms matches a known compound;
- validating structure for compounds that require a specific connection pattern;
- generating a help visual when the player fails several times.

This mechanic already supports two layers of validation:
- ingredient/formula validation;
- structure validation for compounds that define explicit node-edge graphs.

That means the project can already distinguish between:
- "you used the right elements";
- "you used the right elements, but connected them incorrectly".

### Hint and failure flow

The current game tracks failed attempts. After 3 unsuccessful mixes, the player is shown a help modal with a visual structure hint for the target compound. This makes the experience more educational and less punishing.

### Discovery and progression flow

When the player builds a correct compound:
- the result is added to the journal;
- level progress is updated;
- theme completion can trigger a completion modal;
- finishing all themes unlocks the extended palette of bonus elements.

### Mobile behavior

The mobile UX is optimized separately from desktop:
- on touch devices, tapping an element in the palette immediately adds it to the board;
- on larger screens, the desktop interaction model remains intact;
- layouts are adapted for narrower viewports, with the palette and controls reflowed for small screens.

## Interaction Model

The current `Game` screen supports multiple interaction layers depending on device and context.

### Palette interactions

- desktop: drag an element from the palette into the `mix-zone`;
- mobile: tap an element to add it immediately;
- palette selection updates the element card without opening a modal;
- the `Add To Board` button uses the current palette selection and repeats placement quickly.

### Board interactions

- tap or click a node to select it and inspect its element data;
- drag nodes to reposition them;
- drag from connectors to create links;
- remove a node by dragging it outside the `mix-zone`;
- remove a connection by clicking its line.

### Context menu interactions

The `mix-zone` now supports context-aware menus:

- on empty board space:
  - `Add Element`
  - `Refresh`
  - `Mix`
- on a selected node:
  - `Delete`

Desktop trigger:
- right click

Touch trigger:
- double tap on empty space or on a node;
- long press on empty space or on a node.

The `Add Element` action opens a compact element picker next to the context menu. It supports both mouse selection and keyboard navigation.

### Keyboard shortcuts

The project now uses data-driven keyboard shortcuts from:
- `docs/data/hotkeys.json`

Current shortcuts:
- `Escape`: close the active overlay or context layer;
- `Shift + A`: open the add-element menu at the current cursor position;
- `Shift + R`: refresh the board;
- `Shift + M`: run mix;
- `Delete`: remove the currently selected node.

## Current Content

The content package currently includes:

- 12 elements;
- 24 compounds;
- 4 themes;
- 10 levels.

### Element groups

Starter elements:
- `H`
- `O`
- `Na`
- `Cl`

Bonus elements:
- `C`
- `N`
- `S`
- `K`
- `Ca`
- `Mg`
- `P`
- `Fe`

### Themes

- `Basic`
  Focus: first familiar compounds and core construction rules.
- `Gases`
  Focus: simple gas molecules and small combinations.
- `Acids & Bases`
  Focus: reactive compounds and basic acid/base intuition.
- `Oxides`
  Focus: oxygen-rich compounds where structure matters more.

### Levels

- `level-1`: build water (`H2O`)
- `level-2`: build salt (`NaCl`)
- `level-3`: build hydrogen gas (`H2`)
- `level-4`: build oxygen gas (`O2`)
- `level-5`: build chlorine gas (`Cl2`)
- `level-6`: build hydrochloric acid (`HCl`)
- `level-7`: build sodium hydroxide (`NaOH`)
- `level-8`: build sodium oxide (`Na2O`)
- `level-9`: build hydrogen peroxide (`H2O2`)
- `level-10`: build sodium peroxide (`Na2O2`)

## Project Structure

The repository is split into two main areas:

- `docs/` contains the live GitHub Pages application;
- `documentation/` contains internal project documentation.

High-level structure:

```text
Atomic-Smash/
|- docs/
|  |- index.html
|  |- themes.html
|  |- journal.html
|  |- game.html
|  |- styles.css
|  |- data/
|  |  `- game-data.json
|  `- js/
|     |- game.js
|     `- app/
|        |- navigation.js
|        |- palette.js
|        |- modals.js
|        |- state.js
|        |- storage.js
|        `- mechanics/
|           |- index.js
|           `- connection-lab.js
|- documentation/
|  `- ARCHITECTURE.md
`- README.md
```

## Architecture Responsibilities

The codebase is intentionally split by responsibility so multiple people can work in parallel.

### Pages

Each major screen has its own HTML file:
- `docs/index.html`
- `docs/themes.html`
- `docs/journal.html`
- `docs/game.html`

This lets one teammate work on one page without editing a giant shared HTML file.

### Navigation and page flow

File:
- `docs/js/app/navigation.js`

Owns:
- page-to-page transitions;
- theme rendering;
- journal rendering;
- high-level user flow.

Good ownership for:
- menu work;
- UI entry points;
- page interactions;
- progression navigation.

### Palette

File:
- `docs/js/app/palette.js`

Owns:
- rendering of the element palette;
- selected-element state in the UI;
- palette interactions for desktop and mobile.

Good ownership for:
- presentation of elements;
- element cards;
- palette layout;
- touch behavior.

### Mechanics

Files:
- `docs/js/app/mechanics/index.js`
- `docs/js/app/mechanics/connection-lab.js`

Own:
- board logic;
- node placement;
- connection rules;
- evaluation and help visualization.

Good ownership for:
- gameplay systems;
- chemistry interaction rules;
- future mini-game modules.

This area also now owns:
- local coordinate handling inside the `mix-zone`;
- dynamic node sizing support on very small screens;
- SVG connection redraw logic when the board area changes size;
- context-menu-aware node actions such as delete.

### State and persistence

Files:
- `docs/js/app/state.js`
- `docs/js/app/storage.js`

Own:
- application state shape;
- selectors and derived access;
- restoring and saving session progress;
- restoring the active board across pages.

### Orchestration

File:
- `docs/js/game.js`

Owns:
- app startup on gameplay pages;
- wiring modules together;
- handling mix results;
- progression updates;
- shared runtime flow between the UI and the active mechanic.

### Visual system

File:
- `docs/styles.css`

Owns:
- visual tokens in `:root`;
- page layout;
- palette styling;
- responsive rules;
- mobile adaptations.

## Why This Structure Matters

This structure supports both team parallelization and product growth.

It allows:
- one person to work on menu and navigation;
- one person to work on board mechanics and chemistry rules;
- one person to work on palette and visual presentation;
- the project to grow into several mini-games without turning `game.js` back into a monolith.

## Growth Path

The project is already prepared for more mechanics.

To add a new mechanic:

1. Create a new file in `docs/js/app/mechanics/`.
2. Expose the same public API shape used by the current mechanic.
3. Register it in `docs/js/app/mechanics/index.js`.
4. Point a level to that mechanic through data.

This means future features can be added as independent gameplay modules, for example:
- reaction balancing mini-game;
- valence training;
- timed challenge mode;
- formula matching mode;
- compound classification mode;
- guided tutorial mechanics for new players.

## Data Model

The content lives in:
- `docs/data/game-data.json`

It currently contains:
- elements;
- compounds;
- themes;
- levels;
- structural definitions for compounds that need explicit graph validation.

This data-first approach makes balancing and expansion easier because content can grow without rewriting the whole runtime.

## Mix Zone Technical Model

The `connection-lab` mechanic is no longer just a pixel-based freeform board.

### Spatial model

Nodes are stored with local normalized coordinates inside the available `mix-zone` space instead of relying only on absolute pixels. This makes the board more stable when:
- the sidebar width changes;
- the palette is collapsed or expanded;
- the viewport changes size;
- the game is restored on another screen size.

### Rendering model

The mechanic converts local board coordinates into current pixel positions only at render time. This means:
- node placement stays proportional to the current board size;
- connection lines are recalculated from the current connector centers;
- resizing the play area no longer leaves wires in stale positions.

### Resize handling

The board listens for real `mix-zone` size changes through a resize observer. When the zone changes:
- nodes are re-laid out from local coordinates;
- the SVG layer is resized;
- all connection lines are redrawn.

### Adaptive node sizing

Desktop keeps the original node size.

On very small screens, node dimensions and connector dimensions shrink through CSS variables so the board remains usable without changing the desktop look. The gameplay mechanic reads those same dimensions when calculating:
- spawn positions;
- drag bounds;
- out-of-bounds deletion;
- local-to-pixel conversion;
- pixel-to-local conversion.

## Sidebar Controls

The palette sidebar is now adjustable:
- it can be collapsed and restored;
- on desktop it can be resized by dragging its right edge;
- its width and collapsed state are persisted in application state.

This makes the play area more flexible and gives room for future mechanics that may need more horizontal workspace.

## Running Locally

Because the app loads JSON through `fetch`, it should be served through a local server instead of opened directly from the filesystem.

Example:

```powershell
cd D:\Integration-Game\Atomic-Smash
py -m http.server 8080
```

Then open:

- [http://localhost:8080/docs/](http://localhost:8080/docs/)

## GitHub Pages

The project is configured to publish from:

- Branch: `main`
- Folder: `/docs`

That keeps the live site isolated from internal project documentation and any non-public workspace files.

## Documentation

Internal project documentation lives in:

- `documentation/ARCHITECTURE.md`

Use the README as the product and repository entry point, and the `documentation/` folder for deeper internal notes, architecture decisions, and team-facing documentation.

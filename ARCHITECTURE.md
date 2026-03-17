# Atomic Smash Architecture

## Responsibility Split

### Page ownership
- Files: `index.html`, `themes.html`, `journal.html`, `game.html`
- Each major screen now has its own HTML file.
- This lets teammates work on page-level markup independently without editing one shared screen file.

### Menu and navigation
- File: `js/app/navigation.js`
- Owns menu, theme selection, journal rendering, and page-to-page navigation.
- Safe area for a teammate who works on UX flow, menus, buttons, and progression entry points.

### Palette
- File: `js/app/palette.js`
- Owns the element palette, current selection, and the selected-element info card.
- Safe area for a teammate who works on how elements are presented and selected.

### Mechanics and mini-games
- Files: `js/app/mechanics/index.js`, `js/app/mechanics/connection-lab.js`
- `connection-lab.js` owns node placement, connection drawing, board validation, and help visualization.
- Add future mechanics as new files in `js/app/mechanics/` and register them in `index.js`.

### App orchestration and progression
- File: `js/game.js`
- Owns startup, mechanic selection, mix result handling, discoveries, theme completion, and shared refresh flow.
- This layer coordinates modules instead of holding low-level UI logic.

### Data and selectors
- File: `js/app/state.js`
- Stores app state shape and selectors for themes, levels, elements, compounds, and active mechanic resolution.
- Use this file to keep cross-module rules consistent.

### Persistence
- File: `js/app/storage.js`
- Keeps shared progress and the current board in `localStorage`, so switching pages does not reset the session.

### Visual palette
- File: `styles.css`
- Color tokens now live in `:root`.
- Change theme colors there instead of editing component styles one by one.

## Growth Path

### Adding a new mechanic
1. Add a new file in `js/app/mechanics/`.
2. Return the same public API as `connection-lab.js`: `init`, `evaluate`, `reset`, `sync`, `createHelpVisual`.
3. Register it in `js/app/mechanics/index.js`.
4. Optionally set `mechanicId` on a level in `data/game-data.json`.

### Adding more mini-games
- Keep menu and journal unchanged in `navigation.js`.
- Put each mechanic in its own module instead of extending `game.js`.
- Let `game.js` decide which mechanic a level should use.

### Working by page
- `index.html`: menu owner
- `themes.html`: themes/progression owner
- `journal.html`: journal/archive owner
- `game.html`: mechanic/gameplay owner

## Current Benefit

- One teammate can change menus and screen flow without touching board mechanics.
- One teammate can build new connection logic or a new mini-game without rewriting navigation.
- Palette styling and selection logic are isolated from both progression and mechanics.
- Page markup is split, so different people can edit different screens without colliding in one HTML file.

import { initGame } from "./game.js?v=20260512-menu-delegated-click";

initGame().catch(error => {
    console.error(error);

    const result = document.getElementById("result");
    if (result) {
        result.textContent = "Game failed to load.";
    }
});

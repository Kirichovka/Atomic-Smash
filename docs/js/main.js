import { initGame } from "./game.js?v=20260409-scene-schema";

initGame().catch(error => {
    console.error(error);

    const result = document.getElementById("result");
    if (result) {
        result.textContent = "Game failed to load.";
    }
});

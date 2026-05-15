import { initGame } from "./game.js?v=20260515-balance-calcium-unbalanced";

initGame().catch(error => {
    console.error(error);

    const result = document.getElementById("result");
    if (result) {
        result.textContent = "Game failed to load.";
    }
});

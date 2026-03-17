import { initGame } from "./game.js";

initGame().catch(error => {
    console.error(error);

    const result = document.getElementById("result");
    if (result) {
        result.textContent = "Ошибка загрузки игры";
    }
});

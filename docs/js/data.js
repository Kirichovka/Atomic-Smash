export async function loadGameData() {
    const response = await fetch("./data/game-data.json");

    if (!response.ok) {
        throw new Error(`Failed to load game data: ${response.status}`);
    }

    return response.json();
}

export async function loadHotkeysConfig() {
    const response = await fetch("./data/hotkeys.json");

    if (!response.ok) {
        throw new Error(`Failed to load hotkeys config: ${response.status}`);
    }

    return response.json();
}

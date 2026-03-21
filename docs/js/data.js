export async function loadGameData() {
    const response = await fetch("./data/game-data.json");

    if (!response.ok) {
        throw new Error(`Failed to load game data: ${response.status}`);
    }

    const rawData = await response.json();
    return normalizeGameData(rawData);
}

function normalizeGameData(rawData) {
    const chemicalElements = rawData.chemicalElements ?? rawData.elements ?? [];
    const compoundRecipes =
        rawData.compoundFormation?.recipes
        ?? rawData.compoundFormation?.compounds
        ?? rawData.compounds
        ?? [];
    const taskThemes =
        rawData.tasks?.themes
        ?? rawData.themes
        ?? [];
    const taskLevels =
        rawData.tasks?.levels
        ?? rawData.tasks?.items
        ?? rawData.levels
        ?? [];

    return {
        elements: chemicalElements,
        compounds: compoundRecipes,
        themes: taskThemes,
        levels: taskLevels
    };
}

export async function loadHotkeysConfig() {
    const response = await fetch("./data/hotkeys.json");

    if (!response.ok) {
        throw new Error(`Failed to load hotkeys config: ${response.status}`);
    }

    return response.json();
}

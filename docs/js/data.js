import { validateSceneSchemaConfig } from "./app/scene-ui/validator.js";

export async function loadGameData() {
    const response = await fetch("./data/game-data.json");

    if (!response.ok) {
        throw new Error(`Failed to load game data: ${response.status}`);
    }

    const rawData = await response.json();
    return normalizeGameData(rawData);
}

export async function loadHotkeysConfig() {
    const response = await fetch("./data/hotkeys.json");

    if (!response.ok) {
        throw new Error(`Failed to load hotkeys config: ${response.status}`);
    }

    return response.json();
}

export async function loadMenuMapConfig() {
    const response = await fetch("./data/menu-map.json");

    if (!response.ok) {
        throw new Error(`Failed to load menu map config: ${response.status}`);
    }

    return response.json();
}

export async function loadHomeChromeSchemaConfig() {
    const response = await fetch("./data/home-chrome.schema.json");

    if (!response.ok) {
        throw new Error(`Failed to load home chrome schema: ${response.status}`);
    }

    const schema = await response.json();
    return validateSceneSchemaConfig(schema, "home-chrome.schema");
}

export async function loadMenuSceneSchemaConfig() {
    const response = await fetch("./data/menu-scene.schema.json");

    if (!response.ok) {
        throw new Error(`Failed to load menu scene schema: ${response.status}`);
    }

    const schema = await response.json();
    return validateSceneSchemaConfig(schema, "menu-scene.schema");
}

export async function loadLevelBriefsConfig() {
    const response = await fetch("./data/level-briefs.json");

    if (!response.ok) {
        throw new Error(`Failed to load level briefs config: ${response.status}`);
    }

    return response.json();
}

const VALENCY_METADATA = {
    C: {
        valency: 4,
        valencyTheory: "Carbon is the most flexible builder here and is modeled with up to four single connections. That is why it can sit in the center of many molecules."
    },
    Ca: {
        valency: 2,
        valencyTheory: "Calcium is modeled with up to two single connections in this lab, matching many common ionic compounds and oxides."
    },
    Cl: {
        valency: 1,
        valencyTheory: "Chlorine is treated as a one-bond halogen in this lab. It commonly completes its shell with one single connection."
    },
    Fe: {
        valency: 3,
        valencyTheory: "Iron can have multiple oxidation states, but in this lab it is simplified to up to three single connections for beginner oxide patterns."
    },
    H: {
        valency: 1,
        valencyTheory: "Hydrogen is usually treated as a one-bond element in this lab. It fills its outer shell by making one single connection."
    },
    K: {
        valency: 1,
        valencyTheory: "Potassium behaves like sodium in this model and is treated as a one-connection alkali metal."
    },
    Mg: {
        valency: 2,
        valencyTheory: "Magnesium is treated as a two-connection metal in the simplified lab model."
    },
    N: {
        valency: 3,
        valencyTheory: "Nitrogen is usually treated as a three-connection element in this simplified chemistry model, which matches compounds like ammonia."
    },
    Na: {
        valency: 1,
        valencyTheory: "Sodium is modeled here as a one-connection metal. In beginner compounds it usually links once into salts or oxygen-containing structures."
    },
    O: {
        valency: 2,
        valencyTheory: "Oxygen usually makes two single connections in this simplified model. That is why it often sits in the middle of H2O and similar compounds."
    },
    P: {
        valency: 3,
        valencyTheory: "Phosphorus is modeled here with up to three single connections, which fits simple compounds such as phosphine."
    },
    S: {
        valency: 3,
        valencyTheory: "Sulfur can use several bonding patterns, but in this lab it is allowed up to three single connections so sulfur oxides can be built clearly."
    }
};

function normalizeGameData(rawGameData) {
    const elements = (rawGameData.elements ?? rawGameData.chemicalElements ?? [])
        .map(element => enrichElementMetadata(element));
    const compounds =
        rawGameData.compounds
        ?? rawGameData.compoundFormation?.recipes
        ?? rawGameData.compoundFormation?.compounds
        ?? [];
    const themes =
        rawGameData.themes
        ?? rawGameData.tasks?.themes
        ?? [];
    const mechanics =
        rawGameData.mechanics
        ?? rawGameData.tasks?.mechanics
        ?? [];
    const levels = (rawGameData.levels ?? rawGameData.tasks?.levels ?? rawGameData.tasks?.items ?? [])
        .map(level => ({
            displayTitle: level.displayTitle ?? level.title ?? level.objective ?? level.hint ?? level.id,
            learningFocus: level.learningFocus ?? null,
            mechanicId: level.mechanicId ?? "connection-lab",
            ...level
        }));

    return {
        ...rawGameData,
        compounds,
        elements,
        levels,
        mechanics,
        themes
    };
}

function enrichElementMetadata(element) {
    const valencyMetadata = VALENCY_METADATA[element.symbol] ?? {};

    return {
        ...element,
        valency: element.valency ?? valencyMetadata.valency ?? null,
        valencyTheory: element.valencyTheory ?? valencyMetadata.valencyTheory ?? null
    };
}

import { validateHotkeysConfig } from "./app/hotkeys-validator.js";
import { validateSceneSchemaConfig } from "./app/scene-ui/validator.js";

export async function loadGameData() {
    const [rawData, elementReference] = await Promise.all([
        loadJson("./data/game-data.json", "game data"),
        loadJson("./data/element-reference.json", "element reference data")
    ]);

    return normalizeGameData(rawData, elementReference);
}

export async function loadHotkeysConfig() {
    const response = await fetch("./data/hotkeys.json");

    if (!response.ok) {
        throw new Error(`Failed to load hotkeys config: ${response.status}`);
    }

    return validateHotkeysConfig(await response.json());
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
    return validateSceneSchemaConfig(schema, "home-chrome.schema").definitions;
}

export async function loadMenuSceneSchemaConfig() {
    const response = await fetch("./data/menu-scene.schema.json");

    if (!response.ok) {
        throw new Error(`Failed to load menu scene schema: ${response.status}`);
    }

    const schema = await response.json();
    return validateSceneSchemaConfig(schema, "menu-scene.schema").definitions;
}

export async function loadScreenRuntimeSchemaConfig() {
    const response = await fetch("./data/screen-runtime.schema.json");

    if (!response.ok) {
        throw new Error(`Failed to load screen runtime schema: ${response.status}`);
    }

    const schema = await response.json();
    return validateSceneSchemaConfig(schema, "screen-runtime.schema").definitions;
}

export async function loadPaletteRuntimeSchemaConfig() {
    const response = await fetch("./data/palette-runtime.schema.json");

    if (!response.ok) {
        throw new Error(`Failed to load palette runtime schema: ${response.status}`);
    }

    const schema = await response.json();
    return validateSceneSchemaConfig(schema, "palette-runtime.schema").definitions;
}

export async function loadMixZoneContextRuntimeSchemaConfig() {
    const response = await fetch("./data/mix-zone-context-runtime.schema.json");

    if (!response.ok) {
        throw new Error(`Failed to load mix zone context runtime schema: ${response.status}`);
    }

    const schema = await response.json();
    return validateSceneSchemaConfig(schema, "mix-zone-context-runtime.schema").definitions;
}

export async function loadProgressionRuntimeSchemaConfig() {
    const response = await fetch("./data/progression-runtime.schema.json");

    if (!response.ok) {
        throw new Error(`Failed to load progression runtime schema: ${response.status}`);
    }

    const schema = await response.json();
    return validateSceneSchemaConfig(schema, "progression-runtime.schema").definitions;
}

export async function loadGameShellRuntimeSchemaConfig() {
    const response = await fetch("./data/game-shell-runtime.schema.json");

    if (!response.ok) {
        throw new Error(`Failed to load game shell runtime schema: ${response.status}`);
    }

    const schema = await response.json();
    return validateSceneSchemaConfig(schema, "game-shell-runtime.schema").definitions;
}

export async function loadNavigationRuntimeSchemaConfig() {
    const response = await fetch("./data/navigation-runtime.schema.json");

    if (!response.ok) {
        throw new Error(`Failed to load navigation runtime schema: ${response.status}`);
    }

    const schema = await response.json();
    return validateSceneSchemaConfig(schema, "navigation-runtime.schema").definitions;
}

export async function loadModalRuntimeSchemaConfig() {
    const response = await fetch("./data/modal-runtime.schema.json");

    if (!response.ok) {
        throw new Error(`Failed to load modal runtime schema: ${response.status}`);
    }

    const schema = await response.json();
    return validateSceneSchemaConfig(schema, "modal-runtime.schema").definitions;
}

export async function loadBoardRuntimeSchemaConfig() {
    const response = await fetch("./data/board-runtime.schema.json");

    if (!response.ok) {
        throw new Error(`Failed to load board runtime schema: ${response.status}`);
    }

    const schema = await response.json();
    return validateSceneSchemaConfig(schema, "board-runtime.schema").definitions;
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

const RADIOACTIVE_SYMBOLS = new Set([
    "Tc",
    "Pm",
    "Po",
    "At",
    "Rn",
    "Fr",
    "Ra",
    "Ac",
    "Th",
    "Pa",
    "U",
    "Np",
    "Pu",
    "Am",
    "Cm",
    "Bk",
    "Cf",
    "Es",
    "Fm",
    "Md",
    "No",
    "Lr",
    "Rf",
    "Db",
    "Sg",
    "Bh",
    "Hs",
    "Mt",
    "Ds",
    "Rg",
    "Cn",
    "Nh",
    "Fl",
    "Mc",
    "Lv",
    "Ts",
    "Og"
]);

const SEMICONDUCTOR_SYMBOLS = new Set([
    "B",
    "Si",
    "Ge",
    "As",
    "Se",
    "Sb",
    "Te"
]);

const CONDUCTIVE_NONMETAL_SYMBOLS = new Set([
    "C"
]);

const AIR_BEHAVIOR_OVERRIDES = {
    C: "Burns in oxygen when heated and forms carbon oxides.",
    Ca: "Slowly tarnishes in air and burns when strongly heated.",
    Cl: "Does not burn itself, but reacts strongly with many substances as an oxidizer.",
    F: "Extremely reactive in air and attacks many substances without needing a flame.",
    Fe: "Rusts in moist air; fine iron wool burns much more easily than a solid bar.",
    H: "Burns readily in air when ignited and forms water.",
    He: "Completely inert in air under normal conditions.",
    K: "Reacts very quickly with air and can ignite almost immediately.",
    Mg: "Burns in air with an intense bright white flame once ignited.",
    N: "Usually stays inert in air because nitrogen gas is very stable.",
    Na: "Tarnishes quickly in air and can ignite if heated or freshly cut.",
    O: "Does not burn itself, but strongly supports combustion.",
    P: "White phosphorus can ignite in air; red phosphorus needs much stronger heating.",
    S: "Ignites in air with a blue flame and forms sulfur oxides."
};

const INTERESTING_FACT_OVERRIDES = {
    C: "Carbon can build long chains and rings, which is why it is the backbone of organic chemistry.",
    Ca: "Most of the calcium in your body is stored in bones and teeth.",
    Cl: "Chlorine helps disinfect drinking water, but in pure form it is a dangerous gas.",
    Fe: "A large part of Earth's core is thought to be made mostly of iron.",
    H: "Hydrogen is the most abundant element in the visible Universe.",
    He: "Helium becomes liquid only at extremely low temperatures and is famous for cooling superconducting magnets.",
    N: "About 78% of Earth's atmosphere is nitrogen gas.",
    Na: "Sodium is so reactive that it is stored under oil to keep air and water away.",
    O: "Oxygen makes up about one fifth of the air and is essential for most familiar combustion.",
    P: "Phosphorus is central to ATP, one of the main energy-carrying molecules in cells.",
    S: "Sulfur is responsible for the sharp smell often associated with volcanic gases."
};

const COMPOUND_COPY_OVERRIDES = {
    ammonia: {
        context: "Ammonia is widely used in fertilizers and is one of the key industrial molecules behind modern agriculture.",
        headline: "A classic nitrogen-centered molecule with a sharp, recognizable identity.",
        note: "Its trigonal pyramidal shape helps explain why nitrogen chemistry often feels different from carbon chemistry."
    },
    "calcium-hydroxide": {
        context: "Calcium hydroxide appears in water treatment, building materials, and classic classroom acid-base experiments.",
        headline: "A larger hydroxide base built around a metal with two OH branches.",
        note: "It is a strong example of how repeated hydroxide groups can attach to one central metal."
    },
    "calcium-chloride": {
        context: "Calcium chloride is used in drying agents, de-icing, and many laboratory applications.",
        headline: "A larger chloride salt that expands the simple salt family into a three-atom pattern.",
        note: "It is a good reminder that one metal can pair with more than one atom of the same nonmetal."
    },
    "calcium-oxide": {
        context: "Calcium oxide, or quicklime, is important in cement, building materials, and high-temperature industrial processes.",
        headline: "A tough basic oxide built from a reactive metal and oxygen.",
        note: "It is a strong example of how metal oxides behave very differently from simple molecular gases."
    },
    "calcium-sulfide": {
        context: "Calcium sulfide appears in inorganic chemistry discussions and some phosphorescent material contexts.",
        headline: "A compact sulfur salt that broadens the route beyond familiar chloride examples.",
        note: "It helps compare how one metal can form different salts depending on the nonmetal partner."
    },
    "carbon-dioxide": {
        context: "Carbon dioxide appears in the air, fizzy drinks, fire extinguishers, respiration, and combustion.",
        headline: "A straight three-atom molecule that shows how adding one oxygen changes carbon chemistry.",
        note: "Its linear structure makes it a clean comparison point against carbon monoxide and water."
    },
    "carbon-monoxide": {
        context: "Carbon monoxide can form during incomplete combustion and is dangerous because it is hard to detect without sensors.",
        headline: "A tiny carbon-oxygen molecule with a very outsized real-world impact.",
        note: "It is a strong reminder that even a two-atom molecule can be chemically important and hazardous."
    },
    "carbonic-acid": {
        context: "Carbonic acid appears when carbon dioxide dissolves in water, which is part of why sparkling drinks feel fizzy.",
        headline: "A short-lived acid that links gases, liquids, and everyday chemistry together.",
        note: "This molecule is a nice example of how carbon dioxide can transform once water joins the system."
    },
    chlorine: {
        context: "Chlorine gas is used in water treatment and industry, but it must be handled carefully because it is highly reactive.",
        headline: "A reactive elemental molecule that plays a major role in disinfection and chemical production.",
        note: "Even though it is made from only one element, its two-atom form still behaves like a complete molecular species."
    },
    hydrogen: {
        context: "Hydrogen gas is important in fuel research, industry, and the chemistry of stars.",
        headline: "The lightest molecular gas in the game and one of the most abundant substances in the Universe.",
        note: "Its simple two-atom structure makes it a great starting point for understanding covalent bonding."
    },
    "hypochlorous-acid": {
        context: "Hypochlorous acid is part of disinfection chemistry and appears in water-treatment discussions.",
        headline: "A chlorine-based acid where oxygen becomes the key bridge in the structure.",
        note: "It shows how adding oxygen can change a simple acid into a more connected molecular pattern."
    },
    "hydrochloric-acid": {
        context: "Hydrochloric acid is found in laboratory chemistry and in diluted form helps the stomach break down food.",
        headline: "A simple acid with a huge role in both industry and biology.",
        note: "This one shows how a single hydrogen joined to a halogen can already create an acid behavior pattern."
    },
    "hydrogen-peroxide": {
        context: "Hydrogen peroxide is used in cleaning, bleaching, and disinfection because it can release oxygen during reactions.",
        headline: "A more reactive oxygen-rich cousin of water.",
        note: "Compared with water, the extra oxygen changes the molecule into a much stronger oxidizing agent."
    },
    "iron-monoxide": {
        context: "Iron oxides appear in metallurgy, corrosion science, minerals, and industrial materials.",
        headline: "A compact iron oxide that opens the door to transition-metal oxygen chemistry.",
        note: "It helps introduce the idea that metals can form more than one oxide, each with different ratios and behavior."
    },
    "iron-chloride": {
        context: "Iron(III) chloride is used in etching, water treatment, and many laboratory reactions.",
        headline: "A denser transition-metal salt with a very recognizable three-branch structure.",
        note: "It shows that salts can become more structurally rich once transition metals enter the route."
    },
    "iron-oxide": {
        context: "Iron(III) oxide is the familiar reddish material often associated with rust, pigments, and iron-rich minerals.",
        headline: "A denser iron-oxygen structure with the iconic chemistry of rust.",
        note: "This is a good example of why the arrangement and ratio of atoms both matter in compound identity."
    },
    "magnesium-oxide": {
        context: "Magnesium oxide is used in refractory bricks, heat-resistant materials, and some laboratory applications.",
        headline: "A bright-burning metal turned into a stable white oxide.",
        note: "It is a strong classroom example of how reactive metals often settle into much more stable oxygen compounds."
    },
    "magnesium-hydroxide": {
        context: "Magnesium hydroxide is known from chemistry labs and some everyday antacid products.",
        headline: "A mild base that keeps the hydroxide pattern but swaps in a different metal center.",
        note: "It is useful for comparing how similar formulas can still belong to the same base family."
    },
    "magnesium-chloride": {
        context: "Magnesium chloride is used in chemistry, de-icing, and some industrial solution systems.",
        headline: "A chloride salt that mirrors calcium chloride with a different center metal.",
        note: "It strengthens the pattern-recognition side of the salts route by reusing the same overall structure."
    },
    methane: {
        context: "Methane is the main component of natural gas and an important fuel as well as a greenhouse gas.",
        headline: "A carbon-centered four-hydrogen molecule that anchors basic organic chemistry.",
        note: "Its tetrahedral bonding pattern is one of the most famous shapes in introductory chemistry."
    },
    "nitric-acid": {
        context: "Nitric acid is used in fertilizers, etching, and many industrial chemical processes.",
        headline: "A strong oxygen-rich acid built around a nitrogen center.",
        note: "It pushes acid chemistry beyond simple two-atom formulas into a more branched pattern."
    },
    "nitric-oxide": {
        context: "Nitric oxide appears in air chemistry, combustion, and even signaling processes inside the human body.",
        headline: "A small reactive gas that bridges environmental chemistry and biology.",
        note: "This compound shows that nitrogen-oxygen chemistry can be important even with only two atoms."
    },
    "nitrogen-dioxide": {
        context: "Nitrogen dioxide is one of the gases linked to smog, traffic pollution, and atmospheric reactions.",
        headline: "A reactive brown gas that makes nitrogen-oxygen chemistry feel immediately real.",
        note: "Adding one more oxygen changes both the appearance and reactivity of the nitrogen oxide family."
    },
    oxygen: {
        context: "Oxygen gas supports breathing and combustion and is one of the key molecules that shape everyday life on Earth.",
        headline: "The most familiar reactive gas in the lab and a foundation of combustion chemistry.",
        note: "Its two-atom form is stable enough to fill the atmosphere, yet reactive enough to power burning and respiration."
    },
    phosphine: {
        context: "Phosphine is used in specialized industrial chemistry and is known as a toxic gas.",
        headline: "A phosphorus-hydrogen molecule that feels simple on paper but powerful in practice.",
        note: "It is a helpful comparison against ammonia because swapping nitrogen for phosphorus changes the chemistry."
    },
    "potassium-chloride": {
        context: "Potassium chloride is used in fertilizers, chemical processing, and some salt substitutes.",
        headline: "A familiar salt that highlights the bond between an alkali metal and a halogen.",
        note: "It is a neat partner to sodium chloride for comparing how similar formulas can still come from different metals."
    },
    "potassium-hydroxide": {
        context: "Potassium hydroxide is a strong base used in chemical manufacturing, lab work, and cleaning products.",
        headline: "Another powerful hydroxide that mirrors sodium hydroxide with a different metal.",
        note: "It helps the player see a reusable base pattern across the alkali metals."
    },
    "potassium-oxide": {
        context: "Potassium oxide is a reactive metal oxide mostly discussed in advanced chemistry and materials contexts.",
        headline: "An alkali-metal oxide that parallels sodium oxide with a different metal.",
        note: "It is useful for comparing how oxide patterns repeat across related elements."
    },
    salt: {
        context: "Sodium chloride is table salt, one of the most familiar compounds in daily life and food chemistry.",
        headline: "The classic classroom salt and one of the easiest compounds to recognize instantly.",
        note: "It is a perfect early example of how a reactive metal and a reactive nonmetal can form a stable ionic compound."
    },
    "sodium-oxide": {
        context: "Sodium oxide is a strongly basic oxide discussed in metal-oxygen chemistry.",
        headline: "A compact oxide that immediately contrasts with sodium chloride.",
        note: "It is a clean example of how swapping chlorine for oxygen changes both the formula and the chemistry family."
    },
    "sodium-peroxide": {
        context: "Sodium peroxide is a more oxygen-rich sodium compound used in specialized chemistry.",
        headline: "An oxygen-heavy cousin of sodium oxide with a more extended structure.",
        note: "Adding one more oxygen is enough to create a noticeably different oxide family."
    },
    "sodium-sulfide": {
        context: "Sodium sulfide is used in chemical processing and helps extend salt chemistry beyond the halogens.",
        headline: "A sulfur-containing salt that expands the route beyond the familiar chloride family.",
        note: "It is a useful comparison point for seeing how one metal can form multiple different salts."
    },
    "sodium-hypochlorite": {
        context: "Sodium hypochlorite is best known as the active chemistry behind many bleach solutions and disinfectants.",
        headline: "A compact chlorine-oxygen salt where oxygen becomes the bridge between the ions.",
        note: "It is a clean next step after hypochlorous acid because the same Cl-O idea now appears inside a salt."
    },
    "potassium-hypochlorite": {
        context: "Potassium hypochlorite is a less common but very useful comparison compound for understanding the hypochlorite family.",
        headline: "The potassium version of the hypochlorite pattern with the same oxygen-chlorine core.",
        note: "It reinforces that one structural motif can stay the same while the metal partner changes."
    },
    "calcium-hypochlorite": {
        context: "Calcium hypochlorite is used in pool sanitation, bleaching powders, and practical disinfection chemistry.",
        headline: "A larger hypochlorite structure with two chlorine-oxygen branches joined through calcium.",
        note: "This is exactly the kind of formula where the structure matters, because the repeated Cl-O units must be arranged correctly."
    },
    "calcium-carbonate": {
        context: "Calcium carbonate appears in chalk, limestone, coral, shells, and a huge range of everyday mineral materials.",
        headline: "A classic carbonate that links school chemistry directly to rocks, bones, and shells.",
        note: "It is a great bridge from simple salts into polyatomic ion patterns with a carbon-oxygen center."
    },
    "magnesium-carbonate": {
        context: "Magnesium carbonate shows up in minerals, lab chemistry, and the chalk used for grip in sports.",
        headline: "A carbonate cousin of calcium carbonate built around the same carbon-oxygen core.",
        note: "It helps compare how the carbonate framework stays recognizable even when the metal changes."
    },
    "sodium-carbonate": {
        context: "Sodium carbonate, or soda ash, is important in glassmaking, washing products, and traditional inorganic chemistry.",
        headline: "A broader carbonate salt with two sodium atoms wrapped around a carbon-oxygen center.",
        note: "It is useful for learning how one carbon-oxygen group can support a larger overall structure."
    },
    "sodium-bicarbonate": {
        context: "Sodium bicarbonate is baking soda, a very familiar household compound used in food, cleaning, and neutralization reactions.",
        headline: "An everyday bicarbonate with a mixed base-acid identity built into one compact structure.",
        note: "It is a fun comparison point because it carries both a sodium ion and an O-H branch in the same formula."
    },
    "sodium-hydroxide": {
        context: "Sodium hydroxide is a strong base used in cleaning, soap-making, and many industrial reactions.",
        headline: "A powerful base with a reputation for fast, strong chemical action.",
        note: "It helps contrast acids and bases while showing that small formulas can still describe very reactive substances."
    },
    "sulfur-dioxide": {
        context: "Sulfur dioxide appears in volcanic gases, fuel burning, and parts of industrial sulfur chemistry.",
        headline: "A sharp-smelling sulfur oxide with a strong environmental footprint.",
        note: "It is a great stepping stone before comparing how sulfur trioxide becomes even more oxygen-rich and reactive."
    },
    "sulfurous-acid": {
        context: "Sulfurous acid is used in classroom discussions of solution chemistry and acid-rain processes.",
        headline: "A sulfur-centered acid that expands the route into another oxygen-rich acid family.",
        note: "It is a useful comparison point against carbonic and nitric acid because the center atom changes while the acid idea remains."
    },
    "sulfur-trioxide": {
        context: "Sulfur trioxide is important in industrial acid production and reacts strongly with water.",
        headline: "A high-energy sulfur oxide built around an oxygen-heavy arrangement.",
        note: "This compound rewards getting the structure right because the extra oxygen changes the chemistry significantly."
    },
    water: {
        context: "Water fills oceans, rivers, clouds, cells, and almost every biological system you can think of.",
        headline: "The signature life molecule and the perfect first discovery for the lab.",
        note: "Its bent shape and uneven charge distribution help explain why it dissolves so many substances."
    }
};

function normalizeGameData(rawGameData, elementReference = {}) {
    const elements = (rawGameData.elements ?? rawGameData.chemicalElements ?? [])
        .map(element => enrichElementMetadata(element, elementReference[element.symbol]));
    const elementLookup = new Map(elements.map(element => [element.symbol, element]));
    const compounds =
        rawGameData.compounds
        ?? rawGameData.compoundFormation?.recipes
        ?? rawGameData.compoundFormation?.compounds
        ?? [];
    const enrichedCompounds = compounds.map(compound => enrichCompoundMetadata(compound, elementLookup));
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
        compounds: enrichedCompounds,
        elements,
        levels,
        mechanics,
        themes
    };
}

function enrichElementMetadata(element, reference = null) {
    const valencyMetadata = VALENCY_METADATA[element.symbol] ?? {};
    const description = element.description
        ?? createShortDescription(reference?.summary)
        ?? `${element.name} is part of the Atomic Smash reference library.`;
    const detailDescription = element.detailDescription
        ?? createDetailDescription(description, reference?.summary);
    const chemicalCategory = reference?.category ?? null;
    const atomicNumber = Number.isFinite(reference?.number) ? Number(reference.number) : null;
    const meltingPoint = formatTemperature(reference?.meltKelvin);
    const boilingPoint = formatTemperature(reference?.boilKelvin);
    const radioactive = typeof element.radioactive === "boolean"
        ? element.radioactive
        : isRadioactiveElement(element.symbol, atomicNumber);

    return {
        ...element,
        airBehavior: element.airBehavior ?? inferAirBehavior(element.symbol, chemicalCategory),
        appearance: element.appearance ?? reference?.appearance ?? null,
        atomicNumber,
        boilingPoint,
        chemicalCategory,
        density: formatDensity(reference?.density, reference?.phase),
        description,
        detailDescription,
        electricalConductivity: element.electricalConductivity ?? inferElectricalConductivity(element.symbol, chemicalCategory),
        electronConfiguration: reference?.electronConfiguration ?? null,
        freezingPoint: formatTemperature(reference?.meltKelvin),
        funFact: element.funFact ?? createInterestingFact(element, reference),
        journalDescription: description,
        meltingPoint,
        phase: reference?.phase ?? null,
        radioactive,
        radioactivityLabel: radioactive ? "Yes" : "No",
        valency: element.valency ?? valencyMetadata.valency ?? null,
        valencyTheory: element.valencyTheory ?? valencyMetadata.valencyTheory ?? null
    };
}

function enrichCompoundMetadata(compound, elementLookup) {
    const ingredientCounts = buildIngredientCounts(compound.ingredients);
    const ingredientBreakdown = ingredientCounts.map(({ count, symbol }) => {
        const elementName = elementLookup.get(symbol)?.name ?? symbol;
        return `${count} ${elementName}${count > 1 ? " atoms" : " atom"}`;
    }).join(", ");
    const totalAtoms = ingredientCounts.reduce((sum, item) => sum + item.count, 0);
    const override = COMPOUND_COPY_OVERRIDES[compound.id] ?? {};

    return {
        ...compound,
        atomCount: totalAtoms,
        discoveryContext: override.context ?? buildGenericCompoundContext(compound, totalAtoms),
        discoveryDescription: buildCompoundDiscoveryDescription(compound, ingredientBreakdown),
        discoveryHeadline: override.headline ?? buildGenericCompoundHeadline(compound, totalAtoms),
        discoveryNote: override.note ?? buildGenericCompoundNote(compound),
        ingredientBreakdown,
        ingredientCounts
    };
}

async function loadJson(path, label) {
    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Failed to load ${label}: ${response.status}`);
    }

    return response.json();
}

function createShortDescription(summary) {
    return splitIntoSentences(summary)[0] ?? null;
}

function createDetailDescription(description, summary) {
    const sentences = splitIntoSentences(summary);
    const supportingSentence = sentences.find(sentence => !isGenericElementSummarySentence(sentence));

    if (!supportingSentence || normalizeSentence(description) === normalizeSentence(supportingSentence)) {
        return description;
    }

    return `${description} ${supportingSentence}`;
}

function createInterestingFact(element, reference) {
    if (INTERESTING_FACT_OVERRIDES[element.symbol]) {
        return INTERESTING_FACT_OVERRIDES[element.symbol];
    }

    const supportingSentence = splitIntoSentences(reference?.summary)
        .find(sentence => !isGenericElementSummarySentence(sentence));
    if (supportingSentence) {
        return supportingSentence;
    }

    if (reference?.discoveredBy) {
        return `This element was identified by ${reference.discoveredBy}.`;
    }

    if (reference?.namedBy) {
        return `Its modern name is linked to ${reference.namedBy}.`;
    }

    if (reference?.appearance) {
        return `A typical sample looks ${reference.appearance}.`;
    }

    return `${element.name} appears in the journal as part of the full periodic table reference.`;
}

function inferElectricalConductivity(symbol, category = "") {
    const normalizedCategory = String(category ?? "").toLowerCase();

    if (CONDUCTIVE_NONMETAL_SYMBOLS.has(symbol)) {
        return "Can conduct electricity in graphite form.";
    }

    if (SEMICONDUCTOR_SYMBOLS.has(symbol) || normalizedCategory.includes("metalloid")) {
        return "Acts as a semiconductor: conductivity can be tuned.";
    }

    if (
        normalizedCategory.includes("metal") ||
        normalizedCategory.includes("lanthanide") ||
        normalizedCategory.includes("actinide")
    ) {
        return "Good electrical conductor.";
    }

    if (normalizedCategory.includes("noble gas")) {
        return "Does not conduct electricity under normal conditions.";
    }

    return "Poor electrical conductor in normal conditions.";
}

function inferAirBehavior(symbol, category = "") {
    if (AIR_BEHAVIOR_OVERRIDES[symbol]) {
        return AIR_BEHAVIOR_OVERRIDES[symbol];
    }

    const normalizedCategory = String(category ?? "").toLowerCase();

    if (normalizedCategory.includes("noble gas")) {
        return "Barely reacts with air under normal conditions.";
    }

    if (normalizedCategory.includes("alkali metal")) {
        return "Reacts quickly with air and may ignite.";
    }

    if (normalizedCategory.includes("alkaline earth metal")) {
        return "Oxidizes in air; heating or fine powder can make it burn.";
    }

    if (normalizedCategory.includes("halogen")) {
        return "Does not burn itself, but reacts strongly with many other substances.";
    }

    if (normalizedCategory.includes("lanthanide")) {
        return "Usually tarnishes in air and can burn more easily as a powder.";
    }

    if (normalizedCategory.includes("actinide")) {
        return "Tarnishes in air and is chemically reactive as well as radioactive.";
    }

    if (normalizedCategory.includes("metal")) {
        return "Usually forms an oxide layer in air; bulk samples do not burn easily.";
    }

    return "Its reaction with air is modest under normal conditions unless strongly heated.";
}

function isRadioactiveElement(symbol, atomicNumber) {
    return RADIOACTIVE_SYMBOLS.has(symbol) || Number(atomicNumber) >= 84;
}

function formatTemperature(kelvinValue) {
    if (!Number.isFinite(kelvinValue)) {
        return "No standard value";
    }

    const celsiusValue = Number(kelvinValue) - 273.15;
    return `${formatDecimal(celsiusValue)} °C`;
}

function formatDensity(densityValue, phase) {
    if (!Number.isFinite(densityValue)) {
        return "Unknown";
    }

    if (phase === "Gas") {
        return `${formatDecimal(densityValue)} g/L`;
    }

    return `${formatDecimal(densityValue)} g/cm3`;
}

function formatDecimal(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function splitIntoSentences(text) {
    if (typeof text !== "string" || !text.trim()) {
        return [];
    }

    return text
        .replace(/\s+/g, " ")
        .match(/[^.!?]+[.!?]?/g)
        ?.map(sentence => sentence.trim())
        .filter(Boolean)
        ?? [];
}

function isGenericElementSummarySentence(sentence) {
    const normalized = normalizeSentence(sentence);
    return (
        normalized.includes("chemical element") ||
        (normalized.includes("atomic number") && normalized.includes("symbol"))
    );
}

function normalizeSentence(text) {
    return String(text ?? "")
        .trim()
        .toLowerCase();
}

function buildIngredientCounts(ingredients = []) {
    const counts = new Map();

    ingredients.forEach(symbol => {
        counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    });

    return [...counts.entries()].map(([symbol, count]) => ({
        count,
        symbol
    }));
}

function buildCompoundDiscoveryDescription(compound, ingredientBreakdown) {
    const baseDescription = compound.description ?? `${compound.name} is now stored in your discovery journal.`;
    return `${baseDescription} You assembled it from ${ingredientBreakdown}.`;
}

function buildGenericCompoundHeadline(compound, totalAtoms) {
    if (compound.structure) {
        return `A ${totalAtoms}-atom discovery where the shape matters just as much as the formula.`;
    }

    if (totalAtoms <= 2) {
        return "A compact molecule that shows how a very small formula can still carry big chemistry meaning.";
    }

    return `A ${totalAtoms}-atom compound that expands your lab library beyond single elements.`;
}

function buildGenericCompoundContext(compound, totalAtoms) {
    if (compound.structure) {
        return `This compound is a good reminder that the same atoms must also be arranged in the right pattern to count as the correct discovery.`;
    }

    return `${compound.name} gives you another comparison point in the journal, showing how changing atom ratios shifts chemistry and behavior across ${totalAtoms}-atom formulas.`;
}

function buildGenericCompoundNote(compound) {
    if (compound.structure) {
        return "The exact bond layout matters here, so building the right structure is part of the challenge.";
    }

    return "This one is identified mainly by the ingredient set and formula ratio, so it is perfect for comparing with neighboring compounds.";
}

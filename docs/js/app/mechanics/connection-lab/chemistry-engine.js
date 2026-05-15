const FORMULA_SYMBOL_ORDER = [
    "Li", "Be", "Na", "Mg", "Al", "K", "Ca", "Fe", "Cu", "Zn",
    "H", "B", "C", "Si", "N", "P", "S", "O", "F", "Cl", "Br", "I"
];
const FORMULA_SYMBOL_PRIORITY = new Map(FORMULA_SYMBOL_ORDER.map((symbol, index) => [symbol, index]));
const HALOGENS = new Set(["F", "Cl", "Br", "I"]);
const METALS = new Set(["Li", "Be", "Na", "Mg", "Al", "K", "Ca", "Fe", "Cu", "Zn"]);

export function evaluateGeneratedChemistry({
    boardGraph,
    elementsBySymbol,
    nodeEntries
}) {
    if (nodeEntries.length < 2) {
        return {
            reason: "Add at least two atoms before mixing.",
            status: "invalid-generated"
        };
    }

    const connectedIssue = getConnectivityIssue(nodeEntries, boardGraph);
    if (connectedIssue) {
        return {
            reason: connectedIssue,
            status: "invalid-generated"
        };
    }

    const valencyIssues = getValencySaturationIssues(nodeEntries, boardGraph, elementsBySymbol);
    if (valencyIssues.length > 0) {
        return {
            issues: valencyIssues,
            reason: formatValencyIssue(valencyIssues[0]),
            status: "invalid-generated"
        };
    }

    const formula = createFormula(nodeEntries);
    return {
        generatedCompound: {
            classification: classifyFormula(nodeEntries, boardGraph),
            formula,
            name: `Generated ${formula}`,
            stable: true
        },
        status: "generated"
    };
}

function getConnectivityIssue(nodeEntries, boardGraph) {
    if (boardGraph.edgeSet.size === 0) {
        return "Add at least one bond before mixing.";
    }

    const visited = new Set();
    const queue = [nodeEntries[0].id];
    visited.add(nodeEntries[0].id);

    while (queue.length > 0) {
        const nodeId = queue.shift();
        const neighbors = boardGraph.adjacency.get(nodeId) ?? new Set();
        neighbors.forEach(neighborId => {
            if (visited.has(neighborId)) {
                return;
            }

            visited.add(neighborId);
            queue.push(neighborId);
        });
    }

    return visited.size === nodeEntries.length
        ? null
        : "All atoms need to be connected into one structure before mixing.";
}

function getValencySaturationIssues(nodeEntries, boardGraph, elementsBySymbol) {
    return nodeEntries
        .map(node => {
            const element = elementsBySymbol.get(node.symbol);
            const expectedBonds = Number(element?.valency);
            const actualBonds = (boardGraph.adjacency.get(node.id) ?? new Set()).size;

            if (!Number.isFinite(expectedBonds)) {
                return {
                    actualBonds,
                    elementName: element?.name ?? node.symbol,
                    expectedBonds: null,
                    symbol: node.symbol,
                    type: "unsupported"
                };
            }

            if (actualBonds === expectedBonds) {
                return null;
            }

            return {
                actualBonds,
                elementName: element?.name ?? node.symbol,
                expectedBonds,
                symbol: node.symbol,
                type: actualBonds > expectedBonds ? "overfilled" : "underfilled"
            };
        })
        .filter(Boolean);
}

function formatValencyIssue(issue) {
    if (issue.type === "unsupported") {
        return `${issue.elementName} is not in the simplified valency model yet.`;
    }

    return `${issue.elementName} has ${issue.actualBonds} bond${issue.actualBonds === 1 ? "" : "s"}, ` +
        `but this model expects ${issue.expectedBonds}.`;
}

function createFormula(nodeEntries) {
    const counts = new Map();
    nodeEntries.forEach(node => {
        counts.set(node.symbol, (counts.get(node.symbol) ?? 0) + 1);
    });

    return [...counts.entries()]
        .sort(([leftSymbol], [rightSymbol]) => getFormulaPriority(leftSymbol) - getFormulaPriority(rightSymbol))
        .map(([symbol, count]) => `${symbol}${count > 1 ? count : ""}`)
        .join("");
}

function getFormulaPriority(symbol) {
    return FORMULA_SYMBOL_PRIORITY.get(symbol) ?? (1000 + symbol.charCodeAt(0));
}

function classifyFormula(nodeEntries, boardGraph) {
    const symbols = new Set(nodeEntries.map(node => node.symbol));
    const hasMetal = [...symbols].some(symbol => METALS.has(symbol));
    const hasHalogen = [...symbols].some(symbol => HALOGENS.has(symbol));
    const hasOnlyCarbonHydrogen = [...symbols].every(symbol => symbol === "C" || symbol === "H");

    if (symbols.size === 1) {
        return "elemental molecule";
    }

    if (hasMetal && hasHydroxideUnit(nodeEntries, boardGraph)) {
        return "metal hydroxide";
    }

    if (hasMetal && symbols.has("C") && symbols.has("O")) {
        return "carbonate-like salt";
    }

    if (hasMetal && hasHalogen) {
        return "halide salt";
    }

    if (hasMetal && symbols.has("S")) {
        return "metal sulfide";
    }

    if (hasMetal && symbols.has("O")) {
        return "metal oxide";
    }

    if (hasOnlyCarbonHydrogen) {
        return "hydrocarbon";
    }

    if (symbols.has("C") && symbols.has("H") && symbols.has("O")) {
        return "oxygen-containing organic compound";
    }

    if (symbols.has("H") && hasHalogen && symbols.size === 2) {
        return "binary acid";
    }

    if (symbols.has("H") && symbols.has("O")) {
        return "oxygen acid-like molecule";
    }

    if (symbols.has("O")) {
        return "molecular oxide";
    }

    return "simplified valency-stable molecule";
}

function hasHydroxideUnit(nodeEntries, boardGraph) {
    const nodeById = new Map(nodeEntries.map(node => [node.id, node]));

    return nodeEntries.some(node => {
        if (node.symbol !== "O") {
            return false;
        }

        const neighborSymbols = [...(boardGraph.adjacency.get(node.id) ?? new Set())]
            .map(nodeId => nodeById.get(nodeId)?.symbol)
            .filter(Boolean);

        return neighborSymbols.includes("H") && neighborSymbols.some(symbol => METALS.has(symbol));
    });
}

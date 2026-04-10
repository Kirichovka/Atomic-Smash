import { createEdgeKey } from "../../state.js";

export function createConnectionLabEvaluation({
    boardState,
    compoundsByIngredients,
    elementsBySymbol
}) {
    function evaluate() {
        const nodeEntries = boardState.getNodeEntityValues().map(nodeEntity => ({
            id: nodeEntity.id,
            symbol: nodeEntity.metadata.symbol
        }));
        const ingredientKey = nodeEntries.map(node => node.symbol).sort().join(",");
        const candidates = compoundsByIngredients.get(ingredientKey) ?? [];

        if (candidates.length === 0) {
            return { status: "unknown" };
        }

        const boardGraph = createBoardGraph();

        for (const compound of candidates) {
            if (compoundMatchesBoard(compound, nodeEntries, boardGraph)) {
                return { status: "match", compound };
            }
        }

        const structuredCandidate = candidates.find(compound => compound.structure);
        if (structuredCandidate) {
            return { status: "structure-mismatch", compound: structuredCandidate };
        }

        return { status: "unknown" };
    }

    function validateValency() {
        const degreeByNodeId = new Map();

        boardState.getNodes().forEach((_, nodeId) => {
            degreeByNodeId.set(nodeId, 0);
        });

        boardState.getConnections().forEach(connection => {
            degreeByNodeId.set(connection.fromNodeId, (degreeByNodeId.get(connection.fromNodeId) ?? 0) + 1);
            degreeByNodeId.set(connection.toNodeId, (degreeByNodeId.get(connection.toNodeId) ?? 0) + 1);
        });

        const issues = boardState.getNodeEntityValues()
            .map(nodeEntity => {
                const nodeId = nodeEntity.id;
                const symbol = nodeEntity.metadata.symbol;
                const element = elementsBySymbol.get(symbol);
                const allowedBonds = Number(element?.valency);
                const actualBonds = degreeByNodeId.get(nodeId) ?? 0;

                if (!Number.isFinite(allowedBonds) || actualBonds <= allowedBonds) {
                    return null;
                }

                return {
                    actualBonds,
                    allowedBonds,
                    elementName: element?.name ?? symbol,
                    nodeId,
                    symbol
                };
            })
            .filter(Boolean);

        if (issues.length === 0) {
            return { isValid: true, issues: [], elements: [] };
        }

        const issueSymbols = [...new Set(issues.map(issue => issue.symbol))];
        const elements = issueSymbols
            .map(symbol => elementsBySymbol.get(symbol))
            .filter(Boolean)
            .map(element => ({
                name: element.name,
                symbol: element.symbol,
                valency: element.valency,
                valencyTheory: element.valencyTheory
            }));

        return {
            elements,
            isValid: false,
            issues
        };
    }

    return {
        evaluate,
        validateValency
    };

    function createBoardGraph() {
        const edgeSet = new Set();
        const adjacency = new Map();

        boardState.getConnections().forEach(connection => {
            const key = createEdgeKey(connection.fromNodeId, connection.toNodeId);
            edgeSet.add(key);

            const fromList = adjacency.get(connection.fromNodeId) ?? new Set();
            fromList.add(connection.toNodeId);
            adjacency.set(connection.fromNodeId, fromList);

            const toList = adjacency.get(connection.toNodeId) ?? new Set();
            toList.add(connection.fromNodeId);
            adjacency.set(connection.toNodeId, toList);
        });

        return { edgeSet, adjacency };
    }

    function compoundMatchesBoard(compound, nodeEntries, boardGraph) {
        if (compound.ingredients.length !== nodeEntries.length) {
            return false;
        }

        if (!compound.structure) {
            return true;
        }

        return structureMatchesBoard(compound.structure, nodeEntries, boardGraph);
    }

    function structureMatchesBoard(structure, nodeEntries, boardGraph) {
        if (structure.nodes.length !== nodeEntries.length) {
            return false;
        }

        const patternAdjacency = createPatternAdjacency(structure);
        const boardDegrees = new Map(
            nodeEntries.map(node => [node.id, (boardGraph.adjacency.get(node.id) ?? new Set()).size])
        );
        const order = structure.nodes
            .map((symbol, index) => ({
                degree: patternAdjacency.get(index).size,
                index,
                symbol
            }))
            .sort((left, right) => right.degree - left.degree);

        return backtrackStructure(order, 0, new Map(), new Set(), patternAdjacency, nodeEntries, boardGraph.edgeSet, boardDegrees);
    }

    function createPatternAdjacency(structure) {
        const adjacency = new Map();

        structure.nodes.forEach((_, index) => {
            adjacency.set(index, new Set());
        });

        structure.edges.forEach(([fromIndex, toIndex]) => {
            adjacency.get(fromIndex).add(toIndex);
            adjacency.get(toIndex).add(fromIndex);
        });

        return adjacency;
    }

    function backtrackStructure(order, depth, mapping, usedBoardNodes, patternAdjacency, nodeEntries, boardEdgeSet, boardDegrees) {
        if (depth === order.length) {
            return true;
        }

        const target = order[depth];
        const candidates = nodeEntries.filter(node =>
            node.symbol === target.symbol &&
            !usedBoardNodes.has(node.id) &&
            boardDegrees.get(node.id) === target.degree
        );

        for (const candidate of candidates) {
            if (!isConsistentMapping(target.index, candidate.id, mapping, patternAdjacency, boardEdgeSet)) {
                continue;
            }

            mapping.set(target.index, candidate.id);
            usedBoardNodes.add(candidate.id);

            if (backtrackStructure(order, depth + 1, mapping, usedBoardNodes, patternAdjacency, nodeEntries, boardEdgeSet, boardDegrees)) {
                return true;
            }

            mapping.delete(target.index);
            usedBoardNodes.delete(candidate.id);
        }

        return false;
    }

    function isConsistentMapping(patternIndex, boardNodeId, mapping, patternAdjacency, boardEdgeSet) {
        for (const [mappedPatternIndex, mappedBoardNodeId] of mapping.entries()) {
            const patternHasEdge = patternAdjacency.get(patternIndex).has(mappedPatternIndex);
            const boardHasEdge = boardEdgeSet.has(createEdgeKey(boardNodeId, mappedBoardNodeId));

            if (patternHasEdge !== boardHasEdge) {
                return false;
            }
        }

        return true;
    }
}

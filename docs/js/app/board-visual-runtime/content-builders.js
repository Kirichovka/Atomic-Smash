import { createSvgLine } from "../../svg.js";

export function createBoardVisualRuntimeContentBuilder() {
    return {
        createConnectionVisual,
        renderHelpVisual
    };
}

function createConnectionVisual({ onClick, stroke = "var(--wire-solid)" }) {
    const line = createSvgLine(stroke);
    line.classList.add("connection-hitbox");
    if (typeof onClick === "function") {
        line.addEventListener("click", onClick);
    }
    return line;
}

function renderHelpVisual({ compound }) {
    if (!compound) {
        return null;
    }

    const structure = getHelpStructure(compound);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const width = 720;
    const height = 240;
    const positions = layoutHelpNodes(structure.nodes, structure.edges, width, height);

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("aria-hidden", "true");

    structure.edges.forEach(([fromIndex, toIndex], index) => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.classList.add("help-line");
        line.setAttribute("x1", positions[fromIndex].x);
        line.setAttribute("y1", positions[fromIndex].y);
        line.setAttribute("x2", positions[toIndex].x);
        line.setAttribute("y2", positions[toIndex].y);
        line.style.animationDelay = `${index * 0.35}s`;
        svg.appendChild(line);
    });

    structure.nodes.forEach((symbol, index) => {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

        group.setAttribute("transform", `translate(${positions[index].x} ${positions[index].y})`);
        circle.classList.add("help-node-circle");
        circle.setAttribute("r", "34");
        circle.style.animationDelay = `${index * 0.2}s`;

        text.classList.add("help-node-label");
        text.textContent = symbol;

        group.append(circle, text);
        svg.appendChild(group);
    });

    return svg;
}

function getHelpStructure(compound) {
    if (compound.structure) {
        return compound.structure;
    }

    const nodes = compound.ingredients.slice();
    const edges = [];

    for (let index = 0; index < nodes.length - 1; index += 1) {
        edges.push([index, index + 1]);
    }

    return { nodes, edges };
}

function layoutHelpNodes(nodes, edges, width, height) {
    const degrees = new Map(nodes.map((_, index) => [index, 0]));
    edges.forEach(([fromIndex, toIndex]) => {
        degrees.set(fromIndex, degrees.get(fromIndex) + 1);
        degrees.set(toIndex, degrees.get(toIndex) + 1);
    });

    const maxDegree = Math.max(...degrees.values());

    if (maxDegree <= 2) {
        const gap = width / (nodes.length + 1);
        return nodes.map((_, index) => ({
            x: gap * (index + 1),
            y: height / 2
        }));
    }

    const centerIndex = [...degrees.entries()].sort((left, right) => right[1] - left[1])[0][0];
    const positions = nodes.map(() => ({ x: width / 2, y: height / 2 }));
    const outerIndexes = nodes.map((_, index) => index).filter(index => index !== centerIndex);
    const radius = 78;

    positions[centerIndex] = { x: width / 2, y: height / 2 };
    outerIndexes.forEach((index, outerPosition) => {
        const angle = (-Math.PI / 2) + (outerPosition * (2 * Math.PI / Math.max(outerIndexes.length, 1)));
        positions[index] = {
            x: width / 2 + Math.cos(angle) * radius,
            y: height / 2 + Math.sin(angle) * radius
        };
    });

    return positions;
}

export class MenuSceneViewport {
    constructor({ viewportElement, edgeLayerElement, nodeLayerElement }) {
        this.viewportElement = viewportElement;
        this.edgeLayerElement = edgeLayerElement;
        this.nodeLayerElement = nodeLayerElement;
    }

    clear() {
        this.nodeLayerElement?.replaceChildren();
        this.edgeLayerElement?.replaceChildren();
    }

    getRect() {
        return this.viewportElement?.getBoundingClientRect() ?? null;
    }

    observeResize(callback) {
        if (!this.viewportElement || typeof ResizeObserver !== "function") {
            return null;
        }

        const observer = new ResizeObserver(callback);
        observer.observe(this.viewportElement);
        return observer;
    }

    renderNode(nodeElement) {
        this.nodeLayerElement?.appendChild(nodeElement);
    }

    setEdgeViewBox(width, height) {
        this.edgeLayerElement?.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
}

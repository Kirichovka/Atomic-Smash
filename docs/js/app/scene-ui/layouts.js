import { SceneContainerBuilder } from "./builders.js";

export class SceneStackLayoutBuilder {
    constructor({ direction = "row", gap = 0 } = {}) {
        this.direction = direction;
        this.gap = gap;
        this.alignItems = null;
        this.classNames = [];
        this.justifyContent = null;
        this.wrap = null;
    }

    className(...classNames) {
        this.classNames.push(...classNames.filter(Boolean));
        return this;
    }

    align(value) {
        this.alignItems = value;
        return this;
    }

    justify(value) {
        this.justifyContent = value;
        return this;
    }

    wrap(value = "wrap") {
        this.wrap = value;
        return this;
    }

    withGap(value) {
        this.gap = value;
        return this;
    }

    build(children = []) {
        const builder = new SceneContainerBuilder()
            .className(...this.classNames)
            .layout({
                alignItems: this.alignItems ?? "stretch",
                display: "flex",
                flexDirection: this.direction,
                gap: this.gap,
                justifyContent: this.justifyContent ?? "flex-start"
            })
            .children(children);

        if (this.wrap) {
            builder.style("flexWrap", this.wrap);
        }

        return builder.build();
    }
}

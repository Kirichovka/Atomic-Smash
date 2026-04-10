import { createStackLayoutRule } from "./layout-rules.js";
import { SceneContainerBuilder } from "./builders.js";

export class SceneStackLayoutBuilder {
    constructor({ direction = "row", gap = 0 } = {}) {
        this.direction = direction;
        this.gap = gap;
        this.alignItems = null;
        this.classNames = [];
        this.justifyContent = null;
        this.wrapMode = null;
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
        this.wrapMode = value;
        return this;
    }

    withGap(value) {
        this.gap = value;
        return this;
    }

    build(children = []) {
        const builder = new SceneContainerBuilder()
            .className(...this.classNames)
            .layoutRule(
                createStackLayoutRule({
                    align: this.alignItems ?? "stretch",
                    direction: this.direction,
                    gap: this.gap,
                    justify: this.justifyContent ?? "flex-start",
                    wrap: this.wrapMode
                })
            )
            .children(children);

        return builder.build();
    }
}

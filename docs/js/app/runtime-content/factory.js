import { assertRuntimeContentBuilderContract } from "./contracts.js";

export function createRuntimeContentBuilder({
    context,
    factory,
    kind
}) {
    if (typeof factory !== "function") {
        throw new Error(`Cannot create runtime content builder "${kind}": factory is not a function.`);
    }

    const builder = factory(context);
    assertRuntimeContentBuilderContract(builder, kind);

    return Object.assign(builder, {
        runtimeContentBuilderKind: kind
    });
}

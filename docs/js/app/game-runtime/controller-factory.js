import { assertRuntimeControllerContract } from "./controller-contracts.js";

export function createRuntimeController({
    context,
    factory,
    kind
}) {
    if (typeof factory !== "function") {
        throw new Error(`Cannot create runtime controller "${kind}": factory is not a function.`);
    }

    const controller = factory(context);
    assertRuntimeControllerContract(controller, kind);

    return Object.assign(controller, {
        runtimeControllerKind: kind
    });
}

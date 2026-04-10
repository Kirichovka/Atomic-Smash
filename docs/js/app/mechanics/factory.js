import { assertMechanicContract, attachMechanicMetadata } from "./contracts.js";

export function createMechanicInstance({
    config,
    context,
    factory
}) {
    if (typeof factory !== "function") {
        throw new Error(`Cannot create mechanic "${config?.id ?? "unknown"}": factory is not a function.`);
    }

    const mechanic = factory(context);
    assertMechanicContract(mechanic, config);
    return attachMechanicMetadata(mechanic, config);
}

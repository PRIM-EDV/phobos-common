import { Signal, linkedSignal } from "@angular/core";

/**
 * Creates a change signal for the given source.
 * @param source The source signal to track changes for.
 * @returns A linked signal that emits the previous and current values.
 */
export function change<T>(source: Signal<T>): ReturnType<typeof linkedSignal<T, { previous?: T, current: T }>> {
    return linkedSignal<T, { previous?: T, current: T }>({
        source,
        computation: (src, prev) => ({
            previous: prev?.value.current,
            current: src
        })
    });
}
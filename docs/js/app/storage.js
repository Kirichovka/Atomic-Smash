import { createPersistedStateSnapshot } from "./state.js";

export const STORAGE_KEY = "atomic-smash.app-state.v2";

export function loadStoredState() {
    try {
        const rawValue = window.localStorage.getItem(STORAGE_KEY);
        if (!rawValue) {
            return null;
        }

        return JSON.parse(rawValue);
    } catch (error) {
        console.warn("Failed to load saved Atomic Smash state.", error);
        return null;
    }
}

export function persistState(state) {
    try {
        const snapshot = createPersistedStateSnapshot(state);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
        console.warn("Failed to save Atomic Smash state.", error);
    }
}

export function clearStoredState() {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn("Failed to clear saved Atomic Smash state.", error);
    }
}

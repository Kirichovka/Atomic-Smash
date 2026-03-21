export function createEventBus() {
    const listeners = new Map();

    function subscribe(eventName, listener) {
        const eventListeners = listeners.get(eventName) ?? new Set();
        eventListeners.add(listener);
        listeners.set(eventName, eventListeners);

        return () => {
            eventListeners.delete(listener);

            if (eventListeners.size === 0) {
                listeners.delete(eventName);
            }
        };
    }

    function publish(eventName, payload = {}) {
        const eventListeners = listeners.get(eventName);
        if (!eventListeners) {
            return;
        }

        eventListeners.forEach(listener => {
            listener(payload);
        });
    }

    return {
        publish,
        subscribe
    };
}

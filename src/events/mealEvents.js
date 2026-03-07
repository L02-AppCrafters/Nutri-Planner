/**
 * Lightweight event emitter for reactive meal data binding.
 *
 * Components subscribe to MEAL_SAVED to be notified whenever a new meal
 * is written to the database, enabling the dashboard chart to redraw
 * immediately without a page reload.
 */

/** Event name emitted after a meal is successfully saved. */
export const MEAL_SAVED = 'MEAL_SAVED';

class MealEventEmitter {
  constructor() {
    this._listeners = {};
  }

  /**
   * Subscribe to an event.
   *
   * @param {string}   event    - Event name (e.g. MEAL_SAVED)
   * @param {Function} listener - Callback invoked when the event fires
   * @returns {Function} Unsubscribe function – call it to remove the listener
   */
  on(event, listener) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(listener);
    return () => this.off(event, listener);
  }

  /**
   * Remove a previously registered listener.
   *
   * @param {string}   event
   * @param {Function} listener
   */
  off(event, listener) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(l => l !== listener);
    }
  }

  /**
   * Emit an event, calling all registered listeners with the supplied arguments.
   *
   * @param {string} event
   * @param {...*}   args
   */
  emit(event, ...args) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(listener => listener(...args));
    }
  }
}

/** Singleton event emitter shared across the entire app. */
export const mealEvents = new MealEventEmitter();

/**
 * Unit tests for the MealEventEmitter.
 */
import { mealEvents, MEAL_SAVED } from '../src/events/mealEvents';

describe('MealEventEmitter', () => {
  afterEach(() => {
    // Clean up all listeners after each test
    mealEvents._listeners = {};
  });

  it('calls a registered listener when the event is emitted', () => {
    const listener = jest.fn();
    mealEvents.on(MEAL_SAVED, listener);
    mealEvents.emit(MEAL_SAVED, { name: 'Phở', calories: 400 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ name: 'Phở', calories: 400 });
  });

  it('calls multiple listeners', () => {
    const l1 = jest.fn();
    const l2 = jest.fn();
    mealEvents.on(MEAL_SAVED, l1);
    mealEvents.on(MEAL_SAVED, l2);
    mealEvents.emit(MEAL_SAVED, { name: 'Cơm', calories: 600 });
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it('does not call removed listeners', () => {
    const listener = jest.fn();
    const unsubscribe = mealEvents.on(MEAL_SAVED, listener);
    unsubscribe();
    mealEvents.emit(MEAL_SAVED, { name: 'Bún bò', calories: 520 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not throw when emitting with no listeners', () => {
    expect(() => mealEvents.emit(MEAL_SAVED, {})).not.toThrow();
  });

  it('off() removes only the specified listener', () => {
    const l1 = jest.fn();
    const l2 = jest.fn();
    mealEvents.on(MEAL_SAVED, l1);
    mealEvents.on(MEAL_SAVED, l2);
    mealEvents.off(MEAL_SAVED, l1);
    mealEvents.emit(MEAL_SAVED, {});
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it('returns an unsubscribe function from on()', () => {
    const unsubscribe = mealEvents.on(MEAL_SAVED, jest.fn());
    expect(typeof unsubscribe).toBe('function');
  });
});

const Meal = require('../models/Meal');
const { parseApiResponse } = require('../parsers/mealParser');

describe('parseApiResponse', () => {
  // ── Happy-path tests ──────────────────────────────────────────────────────

  test('parses a direct JSON object with all fields present', () => {
    const json = JSON.stringify({
      meal_name: 'Phở bò',
      calories_estimate: 450,
      timestamp: '2026-03-07T12:30:00.000Z',
    });

    const meal = parseApiResponse(json);

    expect(meal).toBeInstanceOf(Meal);
    expect(meal.mealName).toBe('Phở bò');
    expect(meal.calories).toBe(450);
    expect(meal.timestamp).toBe('2026-03-07T12:30:00.000Z');
  });

  test('parses an OpenAI-style response with nested content string', () => {
    const innerContent = JSON.stringify({
      meal_name: 'Bún bò Huế',
      calories_estimate: 520,
      timestamp: '2026-03-07T13:00:00.000Z',
    });
    const json = JSON.stringify({
      id: 'chatcmpl-abc123',
      choices: [{ index: 0, message: { role: 'assistant', content: innerContent } }],
    });

    const meal = parseApiResponse(json);

    expect(meal.mealName).toBe('Bún bò Huế');
    expect(meal.calories).toBe(520);
    expect(meal.timestamp).toBe('2026-03-07T13:00:00.000Z');
  });

  test('accepts an already-parsed object (not a string)', () => {
    const obj = { meal_name: 'Gỏi cuốn', calories_estimate: 150 };

    const meal = parseApiResponse(obj);

    expect(meal.mealName).toBe('Gỏi cuốn');
    expect(meal.calories).toBe(150);
  });

  test('supports alternative field names: name, calories, thoi_gian', () => {
    const json = JSON.stringify({
      name: 'Cơm tấm',
      calories: 600,
      thoi_gian: '2026-03-07T08:00:00.000Z',
    });

    const meal = parseApiResponse(json);

    expect(meal.mealName).toBe('Cơm tấm');
    expect(meal.calories).toBe(600);
    expect(meal.timestamp).toBe('2026-03-07T08:00:00.000Z');
  });

  test('treats plain-text OpenAI content as meal_name', () => {
    const json = JSON.stringify({
      choices: [{ message: { content: 'Bánh cuốn' } }],
    });

    const meal = parseApiResponse(json);

    expect(meal.mealName).toBe('Bánh cuốn');
  });

  // ── Null / Optional-safety tests ─────────────────────────────────────────

  test('returns null for a null input', () => {
    expect(parseApiResponse(null)).toBeNull();
  });

  test('returns null for an undefined input', () => {
    expect(parseApiResponse(undefined)).toBeNull();
  });

  test('returns null for an empty string', () => {
    expect(parseApiResponse('')).toBeNull();
  });

  test('returns null for malformed (non-JSON) string', () => {
    expect(parseApiResponse('not {{ valid json')).toBeNull();
  });

  test('sets mealName to null when the field is absent', () => {
    const json = JSON.stringify({ calories_estimate: 300, timestamp: '2026-03-07T10:00:00.000Z' });

    const meal = parseApiResponse(json);

    expect(meal).not.toBeNull();
    expect(meal.mealName).toBeNull();
  });

  test('sets calories to null when the field is absent', () => {
    const json = JSON.stringify({ meal_name: 'Cháo gà', timestamp: '2026-03-07T07:00:00.000Z' });

    const meal = parseApiResponse(json);

    expect(meal.calories).toBeNull();
  });

  test('fills timestamp with the current time when the field is absent', () => {
    const before = Date.now();
    const json = JSON.stringify({ meal_name: 'Bánh mì', calories_estimate: 200 });

    const meal = parseApiResponse(json);

    expect(meal.timestamp).toBeDefined();
    expect(new Date(meal.timestamp).getTime()).toBeGreaterThanOrEqual(before);
  });

  test('does not crash when choices array is empty', () => {
    const json = JSON.stringify({ choices: [] });

    // Falls through to direct-field extraction; all fields will be null/default
    const meal = parseApiResponse(json);

    expect(meal).not.toBeNull();
    expect(meal.mealName).toBeNull();
  });

  test('does not crash when choices[0].message is missing', () => {
    const json = JSON.stringify({ choices: [{ index: 0 }] });

    const meal = parseApiResponse(json);

    expect(meal).not.toBeNull();
  });
});

import {
  calculateBMR,
  calculateTDEE,
  calculateBMRAndTDEE,
  ACTIVITY_MULTIPLIERS,
} from '../src/utils/calculations';

/**
 * BMR and TDEE unit tests using the Mifflin-St Jeor equation.
 *
 * Reference calculations (manual):
 *   Male,   70 kg, 175 cm, 25 y: BMR = 10*70 + 6.25*175 - 5*25 + 5     = 1668.75
 *   Female, 55 kg, 160 cm, 30 y: BMR = 10*55 + 6.25*160 - 5*30 - 161   = 1339
 */
describe('calculateBMR', () => {
  test('calculates BMR correctly for a male', () => {
    // 10*70 + 6.25*175 - 5*25 + 5 = 700 + 1093.75 - 125 + 5 = 1673.75
    const result = calculateBMR(70, 175, 25, 'male');
    expect(result).toBeCloseTo(1673.75, 2);
  });

  test('calculates BMR correctly for a female', () => {
    // 10*55 + 6.25*160 - 5*30 - 161 = 550 + 1000 - 150 - 161 = 1239
    const result = calculateBMR(55, 160, 30, 'female');
    expect(result).toBeCloseTo(1239, 2);
  });

  test('male BMR > female BMR for same inputs (due to gender offset)', () => {
    const male = calculateBMR(70, 175, 25, 'male');
    const female = calculateBMR(70, 175, 25, 'female');
    // Difference should be exactly 166 (5 - (-161))
    expect(male - female).toBeCloseTo(166, 2);
  });

  test('BMR increases with weight', () => {
    const lighter = calculateBMR(60, 175, 25, 'male');
    const heavier = calculateBMR(80, 175, 25, 'male');
    expect(heavier).toBeGreaterThan(lighter);
  });

  test('BMR increases with height', () => {
    const shorter = calculateBMR(70, 160, 25, 'male');
    const taller = calculateBMR(70, 180, 25, 'male');
    expect(taller).toBeGreaterThan(shorter);
  });

  test('BMR decreases with age', () => {
    const younger = calculateBMR(70, 175, 20, 'male');
    const older = calculateBMR(70, 175, 40, 'male');
    expect(older).toBeLessThan(younger);
  });

  test('throws on non-positive weight', () => {
    expect(() => calculateBMR(0, 175, 25, 'male')).toThrow();
    expect(() => calculateBMR(-5, 175, 25, 'male')).toThrow();
  });

  test('throws on non-positive height', () => {
    expect(() => calculateBMR(70, 0, 25, 'male')).toThrow();
    expect(() => calculateBMR(70, -10, 25, 'male')).toThrow();
  });

  test('throws on non-positive age', () => {
    expect(() => calculateBMR(70, 175, 0, 'male')).toThrow();
    expect(() => calculateBMR(70, 175, -1, 'male')).toThrow();
  });

  test('throws on invalid gender', () => {
    expect(() => calculateBMR(70, 175, 25, 'other')).toThrow();
    expect(() => calculateBMR(70, 175, 25, '')).toThrow();
  });

  test('throws on NaN inputs', () => {
    expect(() => calculateBMR(NaN, 175, 25, 'male')).toThrow();
    expect(() => calculateBMR(70, NaN, 25, 'male')).toThrow();
    expect(() => calculateBMR(70, 175, NaN, 'male')).toThrow();
  });
});

describe('calculateTDEE', () => {
  const referenceBMR = 1673.75; // Male, 70 kg, 175 cm, 25 y

  test('calculates TDEE correctly for sedentary activity', () => {
    const expected = Math.round(referenceBMR * ACTIVITY_MULTIPLIERS.sedentary * 100) / 100;
    expect(calculateTDEE(referenceBMR, 'sedentary')).toBeCloseTo(expected, 2);
  });

  test('calculates TDEE correctly for light activity', () => {
    const expected = Math.round(referenceBMR * ACTIVITY_MULTIPLIERS.light * 100) / 100;
    expect(calculateTDEE(referenceBMR, 'light')).toBeCloseTo(expected, 2);
  });

  test('calculates TDEE correctly for moderate activity', () => {
    const expected = Math.round(referenceBMR * ACTIVITY_MULTIPLIERS.moderate * 100) / 100;
    expect(calculateTDEE(referenceBMR, 'moderate')).toBeCloseTo(expected, 2);
  });

  test('calculates TDEE correctly for active level', () => {
    const expected = Math.round(referenceBMR * ACTIVITY_MULTIPLIERS.active * 100) / 100;
    expect(calculateTDEE(referenceBMR, 'active')).toBeCloseTo(expected, 2);
  });

  test('calculates TDEE correctly for very active level', () => {
    const expected = Math.round(referenceBMR * ACTIVITY_MULTIPLIERS.very_active * 100) / 100;
    expect(calculateTDEE(referenceBMR, 'very_active')).toBeCloseTo(expected, 2);
  });

  test('TDEE increases with higher activity level', () => {
    const sedentary = calculateTDEE(referenceBMR, 'sedentary');
    const veryActive = calculateTDEE(referenceBMR, 'very_active');
    expect(veryActive).toBeGreaterThan(sedentary);
  });

  test('throws on unknown activity level', () => {
    expect(() => calculateTDEE(referenceBMR, 'unknown_level')).toThrow();
  });

  test('throws on non-positive BMR', () => {
    expect(() => calculateTDEE(0, 'moderate')).toThrow();
    expect(() => calculateTDEE(-100, 'moderate')).toThrow();
  });

  test('throws on NaN BMR', () => {
    expect(() => calculateTDEE(NaN, 'moderate')).toThrow();
  });
});

describe('calculateBMRAndTDEE', () => {
  test('returns both BMR and TDEE in one call (male)', () => {
    const { bmr, tdee } = calculateBMRAndTDEE(70, 175, 25, 'male', 'moderate');
    expect(bmr).toBeCloseTo(1673.75, 2);
    expect(tdee).toBeCloseTo(Math.round(1673.75 * 1.55 * 100) / 100, 2);
  });

  test('returns both BMR and TDEE in one call (female)', () => {
    const { bmr, tdee } = calculateBMRAndTDEE(55, 160, 30, 'female', 'light');
    expect(bmr).toBeCloseTo(1239, 2);
    expect(tdee).toBeCloseTo(Math.round(1239 * 1.375 * 100) / 100, 2);
  });

  test('TDEE is always greater than BMR (multiplier > 1)', () => {
    const { bmr, tdee } = calculateBMRAndTDEE(70, 175, 25, 'male', 'sedentary');
    expect(tdee).toBeGreaterThan(bmr);
  });

  test('propagates errors from calculateBMR', () => {
    expect(() => calculateBMRAndTDEE(-1, 175, 25, 'male', 'moderate')).toThrow();
  });

  test('propagates errors from calculateTDEE', () => {
    expect(() => calculateBMRAndTDEE(70, 175, 25, 'male', 'invalid')).toThrow();
  });
});

describe('ACTIVITY_MULTIPLIERS', () => {
  test('contains all 5 activity levels', () => {
    const keys = Object.keys(ACTIVITY_MULTIPLIERS);
    expect(keys).toContain('sedentary');
    expect(keys).toContain('light');
    expect(keys).toContain('moderate');
    expect(keys).toContain('active');
    expect(keys).toContain('very_active');
    expect(keys).toHaveLength(5);
  });

  test('multipliers are in ascending order', () => {
    const values = [
      ACTIVITY_MULTIPLIERS.sedentary,
      ACTIVITY_MULTIPLIERS.light,
      ACTIVITY_MULTIPLIERS.moderate,
      ACTIVITY_MULTIPLIERS.active,
      ACTIVITY_MULTIPLIERS.very_active,
    ];
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

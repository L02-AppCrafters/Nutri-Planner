/**
 * Unit tests for BMR/TDEE calculation utilities.
 * Ported from the onboarding branch to ensure calculations remain correct.
 */
import {
  calculateBMR,
  calculateTDEE,
  calculateBMRAndTDEE,
  ACTIVITY_MULTIPLIERS,
} from '../src/utils/calculations';

describe('calculateBMR', () => {
  it('calculates BMR correctly for a male', () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
    expect(calculateBMR(70, 175, 30, 'male')).toBe(1648.75);
  });

  it('calculates BMR correctly for a female', () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    expect(calculateBMR(60, 165, 25, 'female')).toBe(1345.25);
  });

  it('throws when weight is zero', () => {
    expect(() => calculateBMR(0, 175, 30, 'male')).toThrow();
  });

  it('throws when weight is negative', () => {
    expect(() => calculateBMR(-10, 175, 30, 'male')).toThrow();
  });

  it('throws when height is zero', () => {
    expect(() => calculateBMR(70, 0, 30, 'male')).toThrow();
  });

  it('throws when age is zero', () => {
    expect(() => calculateBMR(70, 175, 0, 'male')).toThrow();
  });

  it('throws for an unknown gender', () => {
    expect(() => calculateBMR(70, 175, 30, 'other')).toThrow();
  });

  it('throws when weight is NaN', () => {
    expect(() => calculateBMR(NaN, 175, 30, 'male')).toThrow();
  });
});

describe('calculateTDEE', () => {
  const bmr = 1648.75;

  it('applies the sedentary multiplier', () => {
    expect(calculateTDEE(bmr, 'sedentary')).toBe(
      Math.round(bmr * ACTIVITY_MULTIPLIERS.sedentary * 100) / 100,
    );
  });

  it('applies the moderate multiplier', () => {
    expect(calculateTDEE(bmr, 'moderate')).toBe(
      Math.round(bmr * ACTIVITY_MULTIPLIERS.moderate * 100) / 100,
    );
  });

  it('throws for an unknown activity level', () => {
    expect(() => calculateTDEE(bmr, 'extreme')).toThrow('Unknown activity level: extreme');
  });

  it('throws when BMR is zero', () => {
    expect(() => calculateTDEE(0, 'moderate')).toThrow();
  });

  it('throws when BMR is negative', () => {
    expect(() => calculateTDEE(-100, 'moderate')).toThrow();
  });
});

describe('calculateBMRAndTDEE', () => {
  it('returns consistent bmr and tdee', () => {
    const result = calculateBMRAndTDEE(70, 175, 30, 'male', 'moderate');
    expect(result).toHaveProperty('bmr');
    expect(result).toHaveProperty('tdee');
    expect(result.tdee).toBe(
      Math.round(result.bmr * ACTIVITY_MULTIPLIERS.moderate * 100) / 100,
    );
  });

  it('throws propagated errors for invalid inputs', () => {
    expect(() => calculateBMRAndTDEE(-1, 175, 30, 'male', 'moderate')).toThrow();
  });
});

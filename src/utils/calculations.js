/**
 * BMR and TDEE calculations using the Mifflin-St Jeor equation.
 *
 * Mifflin-St Jeor formula:
 *   Male:   BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
 *   Female: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
 *
 * TDEE = BMR * activity multiplier
 */

/** @typedef {'male' | 'female'} Gender */

/**
 * Activity level multipliers (Harris-Benedict scale).
 * @type {Object.<string, number>}
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,        // Little or no exercise
  light: 1.375,          // Light exercise 1-3 days/week
  moderate: 1.55,        // Moderate exercise 3-5 days/week
  active: 1.725,         // Hard exercise 6-7 days/week
  very_active: 1.9,      // Very hard exercise & physical job
};

/**
 * Human-readable labels for activity levels.
 */
export const ACTIVITY_LABELS = {
  sedentary: 'Ít vận động (Ít/không tập thể dục)',
  light: 'Nhẹ (Tập 1-3 ngày/tuần)',
  moderate: 'Trung bình (Tập 3-5 ngày/tuần)',
  active: 'Năng động (Tập 6-7 ngày/tuần)',
  very_active: 'Rất năng động (Tập nặng hàng ngày)',
};

/**
 * Calculates the Basal Metabolic Rate using the Mifflin-St Jeor equation.
 *
 * @param {number} weightKg  - Body weight in kilograms
 * @param {number} heightCm  - Height in centimetres
 * @param {number} age       - Age in years
 * @param {Gender} gender    - 'male' or 'female'
 * @returns {number} BMR in kcal/day (rounded to 2 decimal places)
 */
export function calculateBMR(weightKg, heightCm, age, gender) {
  if (
    typeof weightKg !== 'number' || isNaN(weightKg) || weightKg <= 0 ||
    typeof heightCm !== 'number' || isNaN(heightCm) || heightCm <= 0 ||
    typeof age !== 'number' || isNaN(age) || age <= 0 ||
    (gender !== 'male' && gender !== 'female')
  ) {
    throw new Error('Invalid input parameters for BMR calculation');
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const genderOffset = gender === 'male' ? 5 : -161;

  return Math.round((base + genderOffset) * 100) / 100;
}

/**
 * Calculates the Total Daily Energy Expenditure.
 *
 * @param {number} bmr            - BMR in kcal/day
 * @param {string} activityLevel  - Key from ACTIVITY_MULTIPLIERS
 * @returns {number} TDEE in kcal/day (rounded to 2 decimal places)
 */
export function calculateTDEE(bmr, activityLevel) {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  if (multiplier === undefined) {
    throw new Error(`Unknown activity level: ${activityLevel}`);
  }
  if (typeof bmr !== 'number' || isNaN(bmr) || bmr <= 0) {
    throw new Error('Invalid BMR value for TDEE calculation');
  }

  return Math.round(bmr * multiplier * 100) / 100;
}

/**
 * Convenience function: calculate both BMR and TDEE in one call.
 *
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} age
 * @param {Gender} gender
 * @param {string} activityLevel
 * @returns {{ bmr: number, tdee: number }}
 */
export function calculateBMRAndTDEE(weightKg, heightCm, age, gender, activityLevel) {
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  return { bmr, tdee };
}

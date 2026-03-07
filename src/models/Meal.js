/**
 * Meal data model representing a single meal entry.
 *
 * All fields are null-safe to handle incomplete API responses gracefully.
 */
class Meal {
  /**
   * @param {Object} params
   * @param {number|null}  [params.id]        - Auto-generated database ID (null for new records)
   * @param {string|null}  [params.mealName]  - Vietnamese dish name (Tên món)
   * @param {number|null}  [params.calories]  - Estimated calories (Calo)
   * @param {string|null}  [params.timestamp] - ISO-8601 timestamp (Thời gian); defaults to now
   */
  constructor({ id = null, mealName = null, calories = null, timestamp = null } = {}) {
    this.id = id;
    this.mealName = mealName != null ? String(mealName) : null;
    this.calories = calories != null ? Number(calories) : null;
    this.timestamp = timestamp != null ? String(timestamp) : new Date().toISOString();
  }
}

module.exports = Meal;

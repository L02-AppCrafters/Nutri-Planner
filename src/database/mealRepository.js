import { getDatabase } from './database';
import { mealEvents, MEAL_SAVED } from '../events/mealEvents';

/**
 * Inserts a new meal record into the local SQLite database and emits
 * the MEAL_SAVED event so reactive subscribers (e.g. DashboardScreen)
 * can refresh immediately.
 *
 * The operation runs inside an SQLite transaction on a background thread,
 * keeping the main UI thread unblocked.
 *
 * @param {string} name      - Meal name (e.g. "Phở bò")
 * @param {number} calories  - Estimated calories (kcal)
 * @param {string} [timestamp] - ISO-8601 timestamp; defaults to now (UTC)
 * @returns {Promise<number>} The row-id of the newly inserted record
 */
export async function addMeal(name, calories, timestamp) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error('Meal name must be a non-empty string');
  }
  if (typeof calories !== 'number' || isNaN(calories) || calories < 0) {
    throw new Error('Calories must be a non-negative number');
  }

  const ts = timestamp ?? new Date().toISOString();
  const db = await getDatabase();

  const rowId = await new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        tx.executeSql(
          'INSERT INTO Meals (name, calories, timestamp) VALUES (?, ?, ?);',
          [name.trim(), calories, ts],
          (_, result) => resolve(result.insertId),
          (_, err) => { reject(err); return true; },
        );
      },
      reject,
    );
  });

  mealEvents.emit(MEAL_SAVED, { name: name.trim(), calories, timestamp: ts });
  return rowId;
}

/**
 * Returns an array of daily calorie totals for the given date range.
 *
 * Each element is: { date: 'YYYY-MM-DD', totalCalories: number }
 * Days with no meals are NOT included in the result.
 *
 * @param {string} startDate - Inclusive start date, 'YYYY-MM-DD'
 * @param {string} endDate   - Inclusive end date, 'YYYY-MM-DD'
 * @returns {Promise<Array<{date: string, totalCalories: number}>>}
 */
export async function getDailyCalorieTotals(startDate, endDate) {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        tx.executeSql(
          `SELECT
             substr(timestamp, 1, 10) AS date,
             SUM(calories)            AS totalCalories
           FROM Meals
           WHERE substr(timestamp, 1, 10) BETWEEN ? AND ?
           GROUP BY date
           ORDER BY date ASC;`,
          [startDate, endDate],
          (_, result) => {
            const rows = [];
            for (let i = 0; i < result.rows.length; i++) {
              rows.push(result.rows.item(i));
            }
            resolve(rows);
          },
          (_, err) => { reject(err); return true; },
        );
      },
      reject,
    );
  });
}

/**
 * Returns all meals recorded on the given calendar date (local time).
 *
 * @param {string} date - 'YYYY-MM-DD'
 * @returns {Promise<Array<{id: number, name: string, calories: number, timestamp: string}>>}
 */
export async function getMealsByDate(date) {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        tx.executeSql(
          `SELECT id, name, calories, timestamp
           FROM Meals
           WHERE substr(timestamp, 1, 10) = ?
           ORDER BY timestamp ASC;`,
          [date],
          (_, result) => {
            const rows = [];
            for (let i = 0; i < result.rows.length; i++) {
              rows.push(result.rows.item(i));
            }
            resolve(rows);
          },
          (_, err) => { reject(err); return true; },
        );
      },
      reject,
    );
  });
}

/**
 * Repository for Meal database operations.
 *
 * Every public function is async so that database I/O is performed
 * off the main (UI) thread, keeping the interface responsive.
 *
 * The module relies on expo-sqlite's Promise-based API (v14+) which runs
 * all queries on a dedicated background thread inside the native SQLite
 * library.
 */

const { getDatabase } = require('./database');

/**
 * Insert a new Meal record into the Meals table.
 *
 * Null values are stored as SQL NULL rather than the string "null", so a
 * later SELECT can distinguish between a missing value and an actual empty
 * string.
 *
 * @param {import('../models/Meal')} meal - The Meal object to persist.
 * @returns {Promise<number>} The auto-generated row ID of the inserted record.
 */
async function insertMeal(meal) {
  const db = getDatabase();

  const result = await db.runAsync(
    'INSERT INTO Meals (meal_name, calories, timestamp) VALUES (?, ?, ?)',
    meal.mealName ?? null,
    meal.calories ?? null,
    meal.timestamp ?? new Date().toISOString(),
  );

  return result.lastInsertRowId;
}

/**
 * Retrieve every meal stored in the database, newest first.
 *
 * @returns {Promise<Object[]>} Array of raw row objects from the Meals table.
 */
async function getAllMeals() {
  const db = getDatabase();
  return db.getAllAsync('SELECT * FROM Meals ORDER BY timestamp DESC');
}

/**
 * Retrieve all meals logged on a specific calendar day.
 *
 * @param {string} date - A date string in YYYY-MM-DD format.
 * @returns {Promise<Object[]>} Array of row objects whose timestamp starts
 *   with the given date prefix.
 */
async function getMealsByDate(date) {
  const db = getDatabase();
  return db.getAllAsync(
    'SELECT * FROM Meals WHERE timestamp LIKE ? ORDER BY timestamp DESC',
    `${date}%`,
  );
}

module.exports = { insertMeal, getAllMeals, getMealsByDate };

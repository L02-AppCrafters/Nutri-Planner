/**
 * SQLite database initialisation for Expo React Native (expo-sqlite v14+).
 *
 * Usage:
 *   import * as SQLite from 'expo-sqlite';
 *   import { initDatabase } from './database';
 *
 *   await initDatabase(SQLite);
 *
 * The SQLite module is injected as a parameter so that the module can be
 * replaced with a mock during unit tests without touching any global state.
 */

let _db = null;

/**
 * Open (or create) the SQLite database and ensure the Meals table exists.
 *
 * This function is async; it should be awaited before any repository
 * operations are performed.  In React Native the underlying I/O is handled
 * off the JS main thread by the native module, so the UI remains responsive.
 *
 * @param {Object} SQLite - The expo-sqlite module (or a compatible mock).
 * @returns {Promise<Object>} The opened database instance.
 * @throws {Error} When the SQLite module is not provided.
 */
async function initDatabase(SQLite) {
  if (!SQLite) {
    throw new Error('SQLite module is required');
  }

  _db = await SQLite.openDatabaseAsync('nutri_planner.db');

  // Create the Meals table if it does not already exist.
  // All columns accept NULL so that incomplete API responses can be stored
  // without crashing (null-safety requirement).
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS Meals (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_name TEXT,
      calories  REAL,
      timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  return _db;
}

/**
 * Return the currently open database instance.
 *
 * @returns {Object} The database instance.
 * @throws {Error} When the database has not been initialised yet.
 */
function getDatabase() {
  if (!_db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return _db;
}

module.exports = { initDatabase, getDatabase };

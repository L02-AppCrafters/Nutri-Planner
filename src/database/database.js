import * as SQLite from 'expo-sqlite';

/** Singleton database handle, initialised once and reused. */
let _db = null;

/**
 * Opens (or returns the already-open) SQLite database and ensures the
 * Meals table exists.
 *
 * Schema:
 *   Meals(
 *     id        INTEGER PRIMARY KEY AUTOINCREMENT,
 *     name      TEXT    NOT NULL,
 *     calories  REAL    NOT NULL,
 *     timestamp TEXT    NOT NULL   -- ISO-8601 UTC string
 *   )
 *
 * @returns {Promise<SQLite.WebSQLDatabase>}
 */
export async function getDatabase() {
  if (_db) return _db;

  _db = SQLite.openDatabase('nutri_planner.db');

  await new Promise((resolve, reject) => {
    _db.transaction(
      tx => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS Meals (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT    NOT NULL,
            calories  REAL    NOT NULL,
            timestamp TEXT    NOT NULL
          );`,
        );
      },
      reject,
      resolve,
    );
  });

  return _db;
}

/**
 * Resets the module-level database handle (useful for testing).
 * @internal
 */
export function _resetDatabase() {
  _db = null;
}

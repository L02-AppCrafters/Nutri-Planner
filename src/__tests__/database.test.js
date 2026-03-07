const { initDatabase, getDatabase } = require('../database/database');

// Build a fresh mock for every test so module-level state doesn't leak
function buildMocks() {
  const mockExec = jest.fn().mockResolvedValue(undefined);
  const mockDb = { execAsync: mockExec };
  const mockSQLite = { openDatabaseAsync: jest.fn().mockResolvedValue(mockDb) };
  return { mockExec, mockDb, mockSQLite };
}

describe('initDatabase', () => {
  beforeEach(() => {
    // Reset the module so _db is cleared between tests
    jest.resetModules();
  });

  test('opens the correct database file', async () => {
    const { initDatabase: init } = require('../database/database');
    const { mockSQLite, mockDb } = buildMocks();

    const db = await init(mockSQLite);

    expect(mockSQLite.openDatabaseAsync).toHaveBeenCalledWith('nutri_planner.db');
    expect(db).toBe(mockDb);
  });

  test('creates the Meals table with the correct schema', async () => {
    const { initDatabase: init } = require('../database/database');
    const { mockSQLite, mockExec } = buildMocks();

    await init(mockSQLite);

    expect(mockExec).toHaveBeenCalledWith(
      expect.stringMatching(/CREATE TABLE IF NOT EXISTS Meals/),
    );
    const sql = mockExec.mock.calls[0][0];
    expect(sql).toMatch(/id\s+INTEGER PRIMARY KEY AUTOINCREMENT/);
    expect(sql).toMatch(/meal_name\s+TEXT/);
    expect(sql).toMatch(/calories\s+REAL/);
    expect(sql).toMatch(/timestamp\s+TEXT/);
  });

  test('throws an error when the SQLite module is not provided', async () => {
    const { initDatabase: init } = require('../database/database');

    await expect(init(null)).rejects.toThrow('SQLite module is required');
    await expect(init(undefined)).rejects.toThrow('SQLite module is required');
  });

  test('returns the same db instance on repeated calls', async () => {
    const { initDatabase: init, getDatabase: getDb } = require('../database/database');
    const { mockSQLite } = buildMocks();

    const db1 = await init(mockSQLite);
    // Second call reuses the already-opened db stored in _db
    await init(mockSQLite);
    const db2 = getDb();

    expect(db1).toBe(db2);
  });
});

describe('getDatabase', () => {
  test('throws when the database has not been initialised', () => {
    jest.resetModules();
    const { getDatabase: freshGetDb } = require('../database/database');

    expect(() => freshGetDb()).toThrow('Database not initialized');
  });

  test('returns the db instance after initDatabase succeeds', async () => {
    jest.resetModules();
    const { initDatabase: init, getDatabase: getDb } = require('../database/database');
    const { mockSQLite, mockDb } = buildMocks();

    await init(mockSQLite);

    expect(getDb()).toBe(mockDb);
  });
});

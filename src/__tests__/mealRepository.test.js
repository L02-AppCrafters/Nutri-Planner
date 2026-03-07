// ── Shared mock setup ────────────────────────────────────────────────────────
// We reset modules before each test to clear the module-level _db state in
// database.js, then rebuild the mocks and re-initialise the database.

let insertMeal, getAllMeals, getMealsByDate;
let mockRun, mockGetAll, mockExec, mockDb, mockSQLite;

beforeEach(async () => {
  jest.resetModules();

  mockRun = jest.fn();
  mockGetAll = jest.fn();
  mockExec = jest.fn().mockResolvedValue(undefined);
  mockDb = { runAsync: mockRun, getAllAsync: mockGetAll, execAsync: mockExec };
  mockSQLite = { openDatabaseAsync: jest.fn().mockResolvedValue(mockDb) };

  // Initialise the database so getDatabase() won't throw
  const { initDatabase } = require('../database/database');
  await initDatabase(mockSQLite);

  // Load the repository after the DB is ready
  ({ insertMeal, getAllMeals, getMealsByDate } = require('../database/mealRepository'));
});

// ── insertMeal ────────────────────────────────────────────────────────────────

describe('insertMeal', () => {
  test('inserts a complete meal and returns its new row ID', async () => {
    mockRun.mockResolvedValue({ lastInsertRowId: 42 });

    const Meal = require('../models/Meal');
    const meal = new Meal({
      mealName: 'Phở bò',
      calories: 450,
      timestamp: '2026-03-07T12:00:00.000Z',
    });

    const id = await insertMeal(meal);

    expect(id).toBe(42);
    expect(mockRun).toHaveBeenCalledWith(
      'INSERT INTO Meals (meal_name, calories, timestamp) VALUES (?, ?, ?)',
      'Phở bò',
      450,
      '2026-03-07T12:00:00.000Z',
    );
  });

  test('stores null meal_name without throwing (null safety)', async () => {
    mockRun.mockResolvedValue({ lastInsertRowId: 1 });

    const Meal = require('../models/Meal');
    const meal = new Meal({ mealName: null, calories: 300, timestamp: '2026-03-07T12:00:00.000Z' });

    await expect(insertMeal(meal)).resolves.toBe(1);
    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String),
      null,
      300,
      '2026-03-07T12:00:00.000Z',
    );
  });

  test('stores null calories without throwing (null safety)', async () => {
    mockRun.mockResolvedValue({ lastInsertRowId: 2 });

    const Meal = require('../models/Meal');
    const meal = new Meal({ mealName: 'Cơm tấm', calories: null, timestamp: '2026-03-07T12:00:00.000Z' });

    await expect(insertMeal(meal)).resolves.toBe(2);
    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String),
      'Cơm tấm',
      null,
      '2026-03-07T12:00:00.000Z',
    );
  });

  test('uses current time as timestamp when meal.timestamp is null', async () => {
    mockRun.mockResolvedValue({ lastInsertRowId: 3 });

    const before = new Date().toISOString();
    // Manually construct a meal without timestamp to exercise the fallback
    const meal = { mealName: 'Bánh mì', calories: 200, timestamp: null };

    await insertMeal(meal);

    const usedTimestamp = mockRun.mock.calls[0][3];
    expect(new Date(usedTimestamp).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
  });

  test('is async (returns a Promise)', () => {
    mockRun.mockResolvedValue({ lastInsertRowId: 5 });

    const Meal = require('../models/Meal');
    const meal = new Meal({ mealName: 'Hủ tiếu', calories: 480 });

    // If insertMeal were synchronous this would throw; the await proves it is async
    expect(insertMeal(meal)).toBeInstanceOf(Promise);
  });
});

// ── getAllMeals ───────────────────────────────────────────────────────────────

describe('getAllMeals', () => {
  test('returns all meals ordered newest-first', async () => {
    const rows = [
      { id: 2, meal_name: 'Bún bò Huế', calories: 520, timestamp: '2026-03-07T19:00:00.000Z' },
      { id: 1, meal_name: 'Phở bò', calories: 450, timestamp: '2026-03-07T12:00:00.000Z' },
    ];
    mockGetAll.mockResolvedValue(rows);

    const meals = await getAllMeals();

    expect(meals).toHaveLength(2);
    expect(meals[0].meal_name).toBe('Bún bò Huế');
    expect(mockGetAll).toHaveBeenCalledWith(
      expect.stringMatching(/ORDER BY timestamp DESC/),
    );
  });

  test('returns an empty array when no meals exist', async () => {
    mockGetAll.mockResolvedValue([]);

    const meals = await getAllMeals();

    expect(meals).toEqual([]);
  });
});

// ── getMealsByDate ────────────────────────────────────────────────────────────

describe('getMealsByDate', () => {
  test('filters meals by the given date prefix', async () => {
    const rows = [
      { id: 1, meal_name: 'Phở bò', calories: 450, timestamp: '2026-03-07T12:00:00.000Z' },
    ];
    mockGetAll.mockResolvedValue(rows);

    const meals = await getMealsByDate('2026-03-07');

    expect(mockGetAll).toHaveBeenCalledWith(
      expect.stringContaining('LIKE'),
      '2026-03-07%',
    );
    expect(meals).toHaveLength(1);
    expect(meals[0].meal_name).toBe('Phở bò');
  });

  test('returns an empty array when no meals match the date', async () => {
    mockGetAll.mockResolvedValue([]);

    const meals = await getMealsByDate('2099-01-01');

    expect(meals).toEqual([]);
  });
});

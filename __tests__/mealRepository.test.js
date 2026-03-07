/**
 * Unit tests for the mealRepository module.
 *
 * expo-sqlite is mocked so these tests run in Node/Jest without a native device.
 */

jest.mock('expo-sqlite', () => {
  const rows = [];
  const mockTx = {
    executeSql: jest.fn((sql, params, successCb, errorCb) => {
      try {
        if (sql.includes('CREATE TABLE')) {
          if (successCb) successCb(mockTx, { rows: { length: 0, item: () => null } });
        } else if (sql.includes('INSERT INTO Meals')) {
          const [name, calories, timestamp] = params;
          const id = rows.length + 1;
          rows.push({ id, name, calories, timestamp });
          if (successCb) successCb(mockTx, { insertId: id, rows: { length: 0, item: () => null } });
        } else if (sql.includes('SUM(calories)')) {
          const [startDate, endDate] = params;
          // Group by date
          const grouped = {};
          rows.forEach(row => {
            const date = row.timestamp.slice(0, 10);
            if (date >= startDate && date <= endDate) {
              grouped[date] = (grouped[date] || 0) + row.calories;
            }
          });
          const resultRows = Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, totalCalories]) => ({ date, totalCalories }));
          const mockResult = {
            rows: {
              length: resultRows.length,
              item: i => resultRows[i],
            },
          };
          if (successCb) successCb(mockTx, mockResult);
        } else if (sql.includes('SELECT id, name')) {
          const [date] = params;
          const dayRows = rows.filter(r => r.timestamp.slice(0, 10) === date);
          const mockResult = {
            rows: {
              length: dayRows.length,
              item: i => dayRows[i],
            },
          };
          if (successCb) successCb(mockTx, mockResult);
        }
      } catch (err) {
        if (errorCb) errorCb(mockTx, err);
      }
    }),
  };

  const mockDb = {
    transaction: jest.fn((callback, errorCb, successCb) => {
      try {
        callback(mockTx);
        if (successCb) successCb();
      } catch (err) {
        if (errorCb) errorCb(err);
      }
    }),
  };

  return {
    openDatabase: jest.fn(() => mockDb),
    _mockRows: rows,
    _mockDb: mockDb,
    _mockTx: mockTx,
  };
});

// Reset module state between tests
beforeEach(() => {
  jest.resetModules();
  // Clear the in-memory rows array
  const sqlite = require('expo-sqlite');
  sqlite._mockRows.length = 0;
});

describe('addMeal', () => {
  it('inserts a meal and returns a row id', async () => {
    const { addMeal } = require('../src/database/mealRepository');
    const id = await addMeal('Phở bò', 450);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  it('throws when name is empty', async () => {
    const { addMeal } = require('../src/database/mealRepository');
    await expect(addMeal('', 450)).rejects.toThrow('Meal name must be a non-empty string');
  });

  it('throws when name is not a string', async () => {
    const { addMeal } = require('../src/database/mealRepository');
    await expect(addMeal(null, 450)).rejects.toThrow('Meal name must be a non-empty string');
  });

  it('throws when calories is negative', async () => {
    const { addMeal } = require('../src/database/mealRepository');
    await expect(addMeal('Cơm', -100)).rejects.toThrow('Calories must be a non-negative number');
  });

  it('throws when calories is NaN', async () => {
    const { addMeal } = require('../src/database/mealRepository');
    await expect(addMeal('Cơm', NaN)).rejects.toThrow('Calories must be a non-negative number');
  });

  it('accepts zero calories', async () => {
    const { addMeal } = require('../src/database/mealRepository');
    const id = await addMeal('Nước lọc', 0);
    expect(id).toBeGreaterThan(0);
  });

  it('uses provided timestamp', async () => {
    const { addMeal } = require('../src/database/mealRepository');
    const ts = '2024-01-15T08:00:00.000Z';
    const id = await addMeal('Bánh mì', 300, ts);
    expect(id).toBeGreaterThan(0);
  });

  it('emits MEAL_SAVED event after successful insert', async () => {
    const { addMeal } = require('../src/database/mealRepository');
    const { mealEvents, MEAL_SAVED } = require('../src/events/mealEvents');
    const listener = jest.fn();
    mealEvents.on(MEAL_SAVED, listener);
    await addMeal('Bún bò', 520);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Bún bò', calories: 520 }),
    );
  });
});

describe('getDailyCalorieTotals', () => {
  it('returns empty array when no meals exist', async () => {
    const { getDailyCalorieTotals } = require('../src/database/mealRepository');
    const result = await getDailyCalorieTotals('2024-01-01', '2024-01-07');
    expect(result).toEqual([]);
  });

  it('returns aggregated daily totals', async () => {
    const { addMeal, getDailyCalorieTotals } = require('../src/database/mealRepository');
    await addMeal('Bữa sáng', 400, '2024-01-10T07:00:00.000Z');
    await addMeal('Bữa trưa', 600, '2024-01-10T12:00:00.000Z');
    await addMeal('Bữa tối', 500, '2024-01-11T19:00:00.000Z');

    const result = await getDailyCalorieTotals('2024-01-10', '2024-01-11');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: '2024-01-10', totalCalories: 1000 });
    expect(result[1]).toEqual({ date: '2024-01-11', totalCalories: 500 });
  });

  it('excludes meals outside the date range', async () => {
    const { addMeal, getDailyCalorieTotals } = require('../src/database/mealRepository');
    await addMeal('Cơm trước', 300, '2024-01-05T12:00:00.000Z');
    await addMeal('Cơm trong', 500, '2024-01-10T12:00:00.000Z');
    await addMeal('Cơm sau', 400, '2024-01-20T12:00:00.000Z');

    const result = await getDailyCalorieTotals('2024-01-08', '2024-01-12');

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-01-10');
  });
});

describe('getMealsByDate', () => {
  it('returns all meals for the given date', async () => {
    const { addMeal, getMealsByDate } = require('../src/database/mealRepository');
    await addMeal('Phở', 400, '2024-02-05T07:00:00.000Z');
    await addMeal('Cơm', 600, '2024-02-05T12:00:00.000Z');
    await addMeal('Khác ngày', 300, '2024-02-06T12:00:00.000Z');

    const meals = await getMealsByDate('2024-02-05');
    expect(meals).toHaveLength(2);
    expect(meals.map(m => m.name)).toEqual(['Phở', 'Cơm']);
  });

  it('returns empty array when no meals on that date', async () => {
    const { getMealsByDate } = require('../src/database/mealRepository');
    const meals = await getMealsByDate('2024-03-01');
    expect(meals).toEqual([]);
  });
});

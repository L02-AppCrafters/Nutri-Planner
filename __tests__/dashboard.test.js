/**
 * Unit tests for DashboardScreen helper utilities.
 *
 * These tests cover the pure date-manipulation functions exported from
 * DashboardScreen.js, ensuring week navigation logic is correct.
 */

// Mock modules that require native bindings or React Navigation
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
  })),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(cb => cb()),
  NavigationContainer: ({ children }) => children,
}));
jest.mock('react-native-chart-kit', () => ({
  BarChart: 'BarChart',
}));
jest.mock('react-native-svg', () => ({}));

import {
  toLocalDateString,
  getMondayOfWeek,
  getWeekDates,
  formatDayMonth,
} from '../src/screens/DashboardScreen';

describe('toLocalDateString', () => {
  it('formats a date as YYYY-MM-DD', () => {
    const date = new Date(2024, 0, 5); // Jan 5 2024 (local)
    expect(toLocalDateString(date)).toBe('2024-01-05');
  });

  it('zero-pads month and day', () => {
    const date = new Date(2024, 8, 3); // Sep 3 2024
    expect(toLocalDateString(date)).toBe('2024-09-03');
  });

  it('handles end of year', () => {
    const date = new Date(2023, 11, 31); // Dec 31 2023
    expect(toLocalDateString(date)).toBe('2023-12-31');
  });
});

describe('getMondayOfWeek', () => {
  it('returns Monday unchanged when given a Monday', () => {
    const monday = new Date(2024, 0, 1); // Jan 1 2024 is a Monday
    const result = getMondayOfWeek(monday);
    expect(toLocalDateString(result)).toBe('2024-01-01');
  });

  it('returns the correct Monday for a Wednesday', () => {
    const wednesday = new Date(2024, 0, 3); // Jan 3 2024 is a Wednesday
    const result = getMondayOfWeek(wednesday);
    expect(toLocalDateString(result)).toBe('2024-01-01');
  });

  it('returns the correct Monday for a Sunday', () => {
    // Sunday Jan 7 2024 should give Monday Jan 1 2024
    const sunday = new Date(2024, 0, 7);
    const result = getMondayOfWeek(sunday);
    expect(toLocalDateString(result)).toBe('2024-01-01');
  });

  it('returns the correct Monday for a Saturday', () => {
    // Saturday Jan 6 2024 → Monday Jan 1 2024
    const saturday = new Date(2024, 0, 6);
    const result = getMondayOfWeek(saturday);
    expect(toLocalDateString(result)).toBe('2024-01-01');
  });

  it('handles month boundaries correctly', () => {
    // Tuesday Oct 1 2024 → Monday Sep 30 2024
    const tuesday = new Date(2024, 9, 1); // Oct 1 2024
    const result = getMondayOfWeek(tuesday);
    expect(toLocalDateString(result)).toBe('2024-09-30');
  });
});

describe('getWeekDates', () => {
  it('returns exactly 7 dates', () => {
    const monday = new Date(2024, 0, 1);
    const dates = getWeekDates(monday);
    expect(dates).toHaveLength(7);
  });

  it('starts with the given Monday and ends on Sunday', () => {
    const monday = new Date(2024, 0, 1); // Jan 1 2024
    const dates = getWeekDates(monday);
    expect(toLocalDateString(dates[0])).toBe('2024-01-01');
    expect(toLocalDateString(dates[6])).toBe('2024-01-07');
  });

  it('contains consecutive days', () => {
    const monday = new Date(2024, 0, 1);
    const dates = getWeekDates(monday);
    for (let i = 1; i < 7; i++) {
      const diff = dates[i].getTime() - dates[i - 1].getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000); // exactly 1 day in ms
    }
  });
});

describe('formatDayMonth', () => {
  it('formats a date as DD/MM', () => {
    const date = new Date(2024, 2, 7); // Mar 7 2024
    expect(formatDayMonth(date)).toBe('07/03');
  });

  it('zero-pads single-digit day and month', () => {
    const date = new Date(2024, 0, 5); // Jan 5 2024
    expect(formatDayMonth(date)).toBe('05/01');
  });
});

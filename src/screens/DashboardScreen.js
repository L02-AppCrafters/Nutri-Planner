import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import { getDailyCalorieTotals, addMeal } from '../database/mealRepository';
import { loadTDEEResult } from '../storage/storage';
import { mealEvents, MEAL_SAVED } from '../events/mealEvents';

const SCREEN_WIDTH = Dimensions.get('window').width;

const COLORS = {
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  accent: '#FF7043',
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#212121',
  subtext: '#757575',
  border: '#E0E0E0',
  consumed: '#4CAF50',
  target: '#E0E0E0',
};

const SHORT_DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const FULL_DAY_LABELS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

/**
 * Returns an ISO date string 'YYYY-MM-DD' for the given Date object,
 * using local calendar date.
 */
function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the Monday of the week containing the given date.
 *
 * @param {Date} date
 * @returns {Date}
 */
function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  // JS: 0=Sun,1=Mon,...,6=Sat; shift so Mon=0
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns an array of 7 Date objects starting from the given Monday.
 */
function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/**
 * Formats a Date as 'DD/MM'.
 */
function formatDayMonth(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

/**
 * DashboardScreen – shows an interactive weekly bar chart of daily calorie
 * intake vs the user's TDEE goal.
 *
 * Reactive pattern: subscribes to mealEvents.MEAL_SAVED so that whenever a
 * new meal is inserted into SQLite (by any screen), the chart re-renders
 * immediately without requiring a page reload.
 *
 * Navigation: swipe buttons allow browsing previous/next weeks.
 * Tap a bar to see calorie details for that specific day.
 */
export default function DashboardScreen() {
  const [tdee, setTdee] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const [dailyData, setDailyData] = useState(Array(7).fill(0));
  const [weekDates, setWeekDates] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add Meal modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [saving, setSaving] = useState(false);

  // Keep a stable reference to the load function for the event subscription
  const loadDataRef = useRef(null);

  // ─── Load TDEE ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadTDEEResult().then(result => {
      if (result?.tdee) setTdee(Math.round(result.tdee));
    });
  }, []);

  // ─── Load weekly calorie data ───────────────────────────────────────────────

  const loadWeekData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      const baseMonday = getMondayOfWeek(today);
      // Apply week offset
      baseMonday.setDate(baseMonday.getDate() + weekOffset * 7);

      const dates = getWeekDates(baseMonday);
      setWeekDates(dates);

      const startDate = toLocalDateString(dates[0]);
      const endDate = toLocalDateString(dates[6]);

      const rows = await getDailyCalorieTotals(startDate, endDate);

      // Map results into a 7-element array indexed by weekday
      const dataMap = {};
      rows.forEach(row => {
        dataMap[row.date] = row.totalCalories;
      });

      const data = dates.map(d => dataMap[toLocalDateString(d)] ?? 0);
      setDailyData(data);
    } catch (err) {
      Alert.alert('Lỗi', `Không thể tải dữ liệu: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  loadDataRef.current = loadWeekData;

  // Reload when screen gains focus (handles navigation back from other screens)
  useFocusEffect(
    useCallback(() => {
      loadWeekData();
    }, [loadWeekData]),
  );

  // Reactive subscription: chart redraws when any meal is saved
  useEffect(() => {
    const unsubscribe = mealEvents.on(MEAL_SAVED, () => {
      if (loadDataRef.current) loadDataRef.current();
    });
    return unsubscribe;
  }, []);

  // ─── Week navigation ────────────────────────────────────────────────────────

  function goToPreviousWeek() {
    setWeekOffset(prev => prev - 1);
    setSelectedDayIndex(null);
  }

  function goToNextWeek() {
    if (weekOffset < 0) {
      setWeekOffset(prev => prev + 1);
      setSelectedDayIndex(null);
    }
  }

  // ─── Add Meal ───────────────────────────────────────────────────────────────

  async function handleSaveMeal() {
    const name = mealName.trim();
    const cals = parseFloat(mealCalories);

    if (!name) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên bữa ăn.');
      return;
    }
    if (isNaN(cals) || cals <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập lượng calo hợp lệ (số dương).');
      return;
    }

    setSaving(true);
    try {
      await addMeal(name, cals);
      setMealName('');
      setMealCalories('');
      setModalVisible(false);
      // loadWeekData will be called automatically via the MEAL_SAVED event
    } catch (err) {
      Alert.alert('Lỗi', `Không thể lưu bữa ăn: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ─── Derived values ─────────────────────────────────────────────────────────

  const todayConsumed = (() => {
    if (weekOffset !== 0) return null;
    const today = new Date();
    const todayDow = today.getDay(); // 0=Sun
    // ISO weekday index: Mon=0 … Sun=6
    const idx = todayDow === 0 ? 6 : todayDow - 1;
    return dailyData[idx] ?? 0;
  })();

  const isCurrentWeek = weekOffset === 0;

  const weekLabel = (() => {
    if (weekDates.length === 0) return '';
    const start = formatDayMonth(weekDates[0]);
    const end = formatDayMonth(weekDates[6]);
    if (isCurrentWeek) return `Tuần này (${start} – ${end})`;
    return `${start} – ${end}`;
  })();

  // Chart data: consumed calories per day (cap at TDEE*1.5 for display)
  const chartMax = tdee ? tdee * 1.5 : 3000;
  const chartData = {
    labels: SHORT_DAY_LABELS,
    datasets: [
      {
        data: dailyData.map(v => Math.min(v, chartMax)),
        colors: dailyData.map((v, i) => () => {
          if (i === selectedDayIndex) return '#FF7043';
          if (tdee && v >= tdee) return '#388E3C';
          return '#4CAF50';
        }),
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: COLORS.card,
    backgroundGradientTo: COLORS.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: () => COLORS.subtext,
    style: { borderRadius: 12 },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: COLORS.border,
      strokeWidth: 0.5,
    },
    barPercentage: 0.65,
    fillShadowGradientFrom: COLORS.consumed,
    fillShadowGradientTo: COLORS.consumed,
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const selectedDay = selectedDayIndex !== null ? weekDates[selectedDayIndex] : null;
  const selectedCalories = selectedDayIndex !== null ? dailyData[selectedDayIndex] : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bảng Điều Khiển</Text>
          <Text style={styles.subtitle}>Theo dõi lượng calo hàng ngày</Text>
        </View>

        {/* Today summary (current week only) */}
        {isCurrentWeek && tdee !== null && (
          <View style={styles.todayCard} testID="today-card">
            <Text style={styles.todayLabel}>Hôm nay</Text>
            <View style={styles.todayRow}>
              <Text style={styles.todayConsumed} testID="today-consumed">
                {todayConsumed ?? 0}
              </Text>
              <Text style={styles.todaySeparator}> / </Text>
              <Text style={styles.todayTarget} testID="today-target">
                {tdee}
              </Text>
              <Text style={styles.todayUnit}> kcal</Text>
            </View>
            {/* Progress bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, ((todayConsumed ?? 0) / tdee) * 100)}%`,
                    backgroundColor:
                      (todayConsumed ?? 0) >= tdee ? COLORS.primaryDark : COLORS.primary,
                  },
                ]}
                testID="progress-bar"
              />
            </View>
            <Text style={styles.progressLabel}>
              {tdee - (todayConsumed ?? 0) > 0
                ? `Còn lại: ${tdee - (todayConsumed ?? 0)} kcal`
                : 'Đã đạt mục tiêu calo!'}
            </Text>
          </View>
        )}

        {/* TDEE not set warning */}
        {tdee === null && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Chưa tính TDEE. Vui lòng hoàn thành màn hình nhập chỉ số cơ thể.
            </Text>
          </View>
        )}

        {/* Week navigation */}
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={goToPreviousWeek}
            testID="btn-prev-week"
            accessibilityLabel="Tuần trước"
          >
            <Text style={styles.navButtonText}>← Tuần trước</Text>
          </TouchableOpacity>

          <Text style={styles.weekLabel} testID="week-label">
            {weekLabel}
          </Text>

          <TouchableOpacity
            style={[styles.navButton, weekOffset >= 0 && styles.navButtonDisabled]}
            onPress={goToNextWeek}
            disabled={weekOffset >= 0}
            testID="btn-next-week"
            accessibilityLabel="Tuần sau"
          >
            <Text
              style={[
                styles.navButtonText,
                weekOffset >= 0 && styles.navButtonTextDisabled,
              ]}
            >
              Tuần sau →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Calo theo ngày (kcal)</Text>
            {tdee !== null && (
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.consumed }]} />
                  <Text style={styles.legendText}>Đã nạp</Text>
                </View>
                {/* TDEE reference line label */}
                <View style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: COLORS.accent }]} />
                  <Text style={styles.legendText}>Mục tiêu ({tdee} kcal)</Text>
                </View>
              </View>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer} testID="loading-indicator">
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <View testID="chart-container">
              <BarChart
                data={chartData}
                width={SCREEN_WIDTH - 48}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                withCustomBarColorFromData
                flatColor
                showValuesOnTopOfBars
                fromZero
                yAxisSuffix=""
                onDataPointClick={({ index }) => {
                  setSelectedDayIndex(prev => (prev === index ? null : index));
                }}
                testID="bar-chart"
              />

              {/* TDEE reference line overlay */}
              {tdee !== null && (() => {
                const chartHeight = 220;
                const chartPadding = 54; // top + bottom label areas in react-native-chart-kit
                const usableHeight = chartHeight - chartPadding;
                const ratio = Math.min(tdee / chartMax, 1);
                const lineY = chartPadding / 2 + usableHeight * (1 - ratio);
                return (
                  <View
                    style={[styles.tdeeLine, { top: lineY }]}
                    testID="tdee-reference-line"
                    pointerEvents="none"
                  />
                );
              })()}
            </View>
          )}

          {/* Day detail tooltip */}
          {selectedDay !== null && (
            <View style={styles.tooltip} testID="day-tooltip">
              <Text style={styles.tooltipDay}>
                {FULL_DAY_LABELS[selectedDayIndex]}, {formatDayMonth(selectedDay)}
              </Text>
              <Text style={styles.tooltipCalories}>
                Đã nạp: <Text style={styles.tooltipHighlight}>{selectedCalories} kcal</Text>
              </Text>
              {tdee !== null && (
                <Text style={styles.tooltipTarget}>
                  Mục tiêu: {tdee} kcal
                  {'  '}
                  {selectedCalories >= tdee
                    ? '✅ Đạt mục tiêu'
                    : `(còn ${tdee - selectedCalories} kcal)`}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Add Meal Button */}
        <TouchableOpacity
          style={styles.addMealButton}
          onPress={() => setModalVisible(true)}
          testID="btn-add-meal"
          accessibilityRole="button"
        >
          <Text style={styles.addMealButtonText}>+ Thêm Bữa Ăn</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Add Meal Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        testID="add-meal-modal"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Thêm Bữa Ăn</Text>

            <Text style={styles.modalLabel}>Tên món ăn</Text>
            <TextInput
              style={styles.modalInput}
              value={mealName}
              onChangeText={setMealName}
              placeholder="Ví dụ: Phở bò"
              placeholderTextColor="#9E9E9E"
              testID="input-meal-name"
            />

            <Text style={styles.modalLabel}>Lượng calo (kcal)</Text>
            <TextInput
              style={styles.modalInput}
              value={mealCalories}
              onChangeText={text => setMealCalories(text.replace(/[^0-9.]/g, ''))}
              placeholder="Ví dụ: 500"
              placeholderTextColor="#9E9E9E"
              keyboardType="decimal-pad"
              testID="input-meal-calories"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setMealName('');
                  setMealCalories('');
                  setModalVisible(false);
                }}
                testID="btn-cancel-meal"
              >
                <Text style={styles.modalCancelText}>Huỷ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                onPress={handleSaveMeal}
                disabled={saving}
                testID="btn-save-meal"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Helpers (exported for unit testing) ────────────────────────────────────

export { toLocalDateString, getMondayOfWeek, getWeekDates, formatDayMonth };

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.subtext,
  },
  // Today card
  todayCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  todayLabel: {
    fontSize: 13,
    color: COLORS.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  todayConsumed: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  todaySeparator: {
    fontSize: 20,
    color: COLORS.subtext,
  },
  todayTarget: {
    fontSize: 20,
    color: COLORS.subtext,
    fontWeight: '600',
  },
  todayUnit: {
    fontSize: 14,
    color: COLORS.subtext,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.target,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.subtext,
  },
  // Warning
  warningCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  warningText: {
    fontSize: 13,
    color: '#795548',
    lineHeight: 18,
  },
  // Week navigation
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: COLORS.subtext,
  },
  weekLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 6,
  },
  // Chart card
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  chartHeader: {
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.subtext,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -16,
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // TDEE reference line
  tdeeLine: {
    position: 'absolute',
    left: 46,
    right: 16,
    height: 2,
    backgroundColor: COLORS.accent,
    opacity: 0.8,
    borderRadius: 1,
  },
  // Day tooltip
  tooltip: {
    marginTop: 12,
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
    padding: 12,
  },
  tooltipDay: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  tooltipCalories: {
    fontSize: 13,
    color: COLORS.subtext,
  },
  tooltipHighlight: {
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  tooltipTarget: {
    fontSize: 13,
    color: COLORS.subtext,
    marginTop: 2,
  },
  // Add Meal button
  addMealButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  addMealButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.subtext,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

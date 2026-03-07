import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ACTIVITY_LABELS } from '../utils/calculations';

const COLORS = {
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#212121',
  subtext: '#757575',
  border: '#E0E0E0',
  accent: '#FF7043',
  accentLight: '#FFF3E0',
};

/**
 * Displays the calculated BMR and TDEE values for the user,
 * along with a brief explanation and the option to re-enter data.
 */
export default function ResultScreen({ navigation, route }) {
  const { bmr, tdee, profile } = route.params;

  const genderLabel = profile.gender === 'male' ? 'Nam' : 'Nữ';
  const activityLabel = ACTIVITY_LABELS[profile.activityLevel] ?? profile.activityLevel;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Kết Quả Tính Toán</Text>
          <Text style={styles.subtitle}>
            Dựa trên chỉ số cơ thể của bạn (Mifflin-St Jeor)
          </Text>
        </View>

        {/* BMR Card */}
        <View style={[styles.resultCard, styles.bmrCard]}>
          <Text style={styles.cardLabel}>Tỷ lệ trao đổi chất cơ bản (BMR)</Text>
          <Text style={styles.cardValue} testID="result-bmr">
            {bmr.toFixed(0)}
            <Text style={styles.cardUnit}> kcal/ngày</Text>
          </Text>
          <Text style={styles.cardDescription}>
            Lượng calo cơ thể cần để duy trì hoạt động sống cơ bản khi nghỉ ngơi hoàn toàn.
          </Text>
        </View>

        {/* TDEE Card */}
        <View style={[styles.resultCard, styles.tdeeCard]}>
          <Text style={styles.cardLabel}>Tổng năng lượng tiêu hao (TDEE)</Text>
          <Text style={styles.cardValueTdee} testID="result-tdee">
            {tdee.toFixed(0)}
            <Text style={styles.cardUnit}> kcal/ngày</Text>
          </Text>
          <Text style={styles.cardDescription}>
            Đây là mục tiêu calo hàng ngày của bạn. Ăn ít hơn để giảm cân, nhiều hơn để tăng cân.
          </Text>
        </View>

        {/* Profile Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Chỉ số đã nhập</Text>
          {[
            { label: 'Cân nặng', value: `${profile.weightKg} kg` },
            { label: 'Chiều cao', value: `${profile.heightCm} cm` },
            { label: 'Tuổi', value: `${profile.age} tuổi` },
            { label: 'Giới tính', value: genderLabel },
            { label: 'Mức vận động', value: activityLabel },
          ].map(row => (
            <View key={row.label} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={styles.summaryValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Note */}
        <Text style={styles.saveNote}>
          ✅ Chỉ số TDEE đã được lưu vào bộ nhớ thiết bị.
        </Text>

        {/* Recalculate Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          testID="btn-recalculate"
        >
          <Text style={styles.backButtonText}>Nhập Lại Chỉ Số</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    textAlign: 'center',
  },
  resultCard: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  bmrCard: {
    backgroundColor: COLORS.card,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
  },
  tdeeCard: {
    backgroundColor: COLORS.accentLight,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.accent,
  },
  cardLabel: {
    fontSize: 13,
    color: COLORS.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 8,
  },
  cardValueTdee: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 8,
  },
  cardUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: COLORS.subtext,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.subtext,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.subtext,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveNote: {
    textAlign: 'center',
    color: COLORS.primaryDark,
    fontSize: 13,
    marginBottom: 20,
  },
  backButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});

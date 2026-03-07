import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ACTIVITY_LABELS } from '../utils/calculations';
import { calculateBMRAndTDEE } from '../utils/calculations';
import { saveUserProfile, saveTDEEResult } from '../storage/storage';

const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_LABELS).map(([key, label]) => ({
  key,
  label,
}));

/**
 * Onboarding screen – collects the user's body metrics, computes BMR/TDEE,
 * persists the results, and navigates to the Result screen.
 */
export default function OnboardingScreen({ navigation }) {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [errors, setErrors] = useState({});

  // ─── Validation ─────────────────────────────────────────────────────────────

  function validateInputs() {
    const newErrors = {};

    const weightNum = parseFloat(weight);
    if (!weight.trim()) {
      newErrors.weight = 'Vui lòng nhập cân nặng.';
    } else if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
      newErrors.weight = 'Cân nặng phải là số dương (1 – 500 kg).';
    }

    const heightNum = parseFloat(height);
    if (!height.trim()) {
      newErrors.height = 'Vui lòng nhập chiều cao.';
    } else if (isNaN(heightNum) || heightNum <= 0 || heightNum > 300) {
      newErrors.height = 'Chiều cao phải là số dương (1 – 300 cm).';
    }

    const ageNum = parseInt(age, 10);
    if (!age.trim()) {
      newErrors.age = 'Vui lòng nhập tuổi.';
    } else if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      newErrors.age = 'Tuổi phải là số nguyên dương (1 – 120).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  async function handleCalculate() {
    if (!validateInputs()) return;

    try {
      const weightNum = parseFloat(weight);
      const heightNum = parseFloat(height);
      const ageNum = parseInt(age, 10);

      const { bmr, tdee } = calculateBMRAndTDEE(
        weightNum,
        heightNum,
        ageNum,
        gender,
        activityLevel,
      );

      const profile = { weightKg: weightNum, heightCm: heightNum, age: ageNum, gender, activityLevel };
      await saveUserProfile(profile);
      await saveTDEEResult({ bmr, tdee });

      navigation.navigate('Result', { bmr, tdee, profile });
    } catch (err) {
      Alert.alert('Lỗi', `Không thể hoàn thành: ${err.message}`);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Thông Số Cơ Thể</Text>
          <Text style={styles.subtitle}>
            Nhập các chỉ số của bạn để tính toán nhu cầu calo hàng ngày.
          </Text>
        </View>

        {/* Weight */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cân nặng (kg)</Text>
          <TextInput
            style={[styles.input, errors.weight ? styles.inputError : null]}
            value={weight}
            onChangeText={text => {
              setWeight(text.replace(/[^0-9.]/g, ''));
              setErrors(prev => ({ ...prev, weight: undefined }));
            }}
            keyboardType="decimal-pad"
            placeholder="Ví dụ: 65"
            placeholderTextColor="#9E9E9E"
            accessibilityLabel="Nhập cân nặng"
            testID="input-weight"
          />
          {errors.weight ? <Text style={styles.errorText}>{errors.weight}</Text> : null}
        </View>

        {/* Height */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Chiều cao (cm)</Text>
          <TextInput
            style={[styles.input, errors.height ? styles.inputError : null]}
            value={height}
            onChangeText={text => {
              setHeight(text.replace(/[^0-9.]/g, ''));
              setErrors(prev => ({ ...prev, height: undefined }));
            }}
            keyboardType="decimal-pad"
            placeholder="Ví dụ: 170"
            placeholderTextColor="#9E9E9E"
            accessibilityLabel="Nhập chiều cao"
            testID="input-height"
          />
          {errors.height ? <Text style={styles.errorText}>{errors.height}</Text> : null}
        </View>

        {/* Age */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tuổi</Text>
          <TextInput
            style={[styles.input, errors.age ? styles.inputError : null]}
            value={age}
            onChangeText={text => {
              setAge(text.replace(/[^0-9]/g, ''));
              setErrors(prev => ({ ...prev, age: undefined }));
            }}
            keyboardType="number-pad"
            placeholder="Ví dụ: 25"
            placeholderTextColor="#9E9E9E"
            accessibilityLabel="Nhập tuổi"
            testID="input-age"
          />
          {errors.age ? <Text style={styles.errorText}>{errors.age}</Text> : null}
        </View>

        {/* Gender */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Giới tính</Text>
          <View style={styles.genderRow}>
            {[
              { key: 'male', label: 'Nam' },
              { key: 'female', label: 'Nữ' },
            ].map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.genderButton,
                  gender === option.key && styles.genderButtonActive,
                ]}
                onPress={() => setGender(option.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: gender === option.key }}
                testID={`gender-${option.key}`}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === option.key && styles.genderButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activity Level */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mức độ vận động</Text>
          {ACTIVITY_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.activityButton,
                activityLevel === option.key && styles.activityButtonActive,
              ]}
              onPress={() => setActivityLevel(option.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: activityLevel === option.key }}
              testID={`activity-${option.key}`}
            >
              <View style={styles.activityRadio}>
                <View
                  style={[
                    styles.radioOuter,
                    activityLevel === option.key && styles.radioOuterActive,
                  ]}
                >
                  {activityLevel === option.key && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
              <Text
                style={[
                  styles.activityButtonText,
                  activityLevel === option.key && styles.activityButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calculate Button */}
        <TouchableOpacity
          style={styles.calculateButton}
          onPress={handleCalculate}
          accessibilityRole="button"
          testID="btn-calculate"
        >
          <Text style={styles.calculateButtonText}>Tính Toán TDEE / BMR</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  error: '#D32F2F',
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#212121',
  subtext: '#757575',
  border: '#E0E0E0',
  borderError: '#D32F2F',
};

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
    marginBottom: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.borderError,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  genderButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F5E9',
  },
  genderButtonText: {
    fontSize: 15,
    color: COLORS.subtext,
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  activityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  activityButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F5E9',
  },
  activityRadio: {
    marginRight: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  activityButtonText: {
    fontSize: 14,
    color: COLORS.subtext,
    flex: 1,
  },
  activityButtonTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  calculateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

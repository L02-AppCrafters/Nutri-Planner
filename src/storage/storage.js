import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_PROFILE: '@nutri_planner:user_profile',
  TDEE_RESULT: '@nutri_planner:tdee_result',
};

/**
 * Saves the user's body metrics to local storage.
 *
 * @param {{ weightKg: number, heightCm: number, age: number, gender: string, activityLevel: string }} profile
 */
export async function saveUserProfile(profile) {
  try {
    await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (err) {
    throw new Error(`Failed to save user profile: ${err.message}`);
  }
}

/**
 * Loads the user's body metrics from local storage.
 *
 * @returns {Promise<object|null>} The stored profile, or null if not found.
 */
export async function loadUserProfile() {
  const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Saves the calculated BMR and TDEE results to local storage.
 *
 * @param {{ bmr: number, tdee: number }} result
 */
export async function saveTDEEResult(result) {
  try {
    await AsyncStorage.setItem(KEYS.TDEE_RESULT, JSON.stringify(result));
  } catch (err) {
    throw new Error(`Failed to save TDEE result: ${err.message}`);
  }
}

/**
 * Loads the stored BMR/TDEE result from local storage.
 *
 * @returns {Promise<{bmr: number, tdee: number}|null>}
 */
export async function loadTDEEResult() {
  const raw = await AsyncStorage.getItem(KEYS.TDEE_RESULT);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clears all Nutri-Planner data from local storage.
 */
export async function clearAllData() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

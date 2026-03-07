/**
 * Camera & photo-library permission helper.
 *
 * This module provides a platform-agnostic interface for requesting runtime
 * permissions before accessing the camera or the user's photo library.
 *
 * Platform notes
 * ──────────────
 * • **React Native** – uses `react-native-permissions` under the hood.  Install
 *   it with `npm i react-native-permissions` and follow the platform setup in
 *   their README.  The helper is injected via {@link setPermissionsAdapter}.
 * • **Web (browser)** – uses the `navigator.mediaDevices` / `navigator.permissions`
 *   APIs where available.
 * • **Node.js / tests** – a stub adapter is used so unit tests run without any
 *   native bindings.
 */

const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  BLOCKED: 'blocked',
  UNAVAILABLE: 'unavailable',
};

/** @type {{ requestCamera: Function, requestPhotoLibrary: Function } | null} */
let _adapter = null;

/**
 * Injects the platform-specific permission adapter.
 * Call this once during app bootstrap before using any permission helper.
 *
 * @param {{ requestCamera: () => Promise<string>, requestPhotoLibrary: () => Promise<string> }} adapter
 */
function setPermissionsAdapter(adapter) {
  if (
    typeof adapter?.requestCamera !== 'function' ||
    typeof adapter?.requestPhotoLibrary !== 'function'
  ) {
    throw new Error(
      'Permission adapter must expose requestCamera() and requestPhotoLibrary() methods.'
    );
  }
  _adapter = adapter;
}

/**
 * Returns the currently registered adapter (or the default stub).
 * @returns {{ requestCamera: Function, requestPhotoLibrary: Function }}
 */
function _getAdapter() {
  if (_adapter) return _adapter;

  // Default stub – used in test / non-browser environments.
  return {
    requestCamera: async () => PermissionStatus.UNAVAILABLE,
    requestPhotoLibrary: async () => PermissionStatus.UNAVAILABLE,
  };
}

/**
 * Requests permission to use the device camera.
 *
 * @returns {Promise<string>}  One of the {@link PermissionStatus} values.
 */
async function requestCameraPermission() {
  try {
    const status = await _getAdapter().requestCamera();
    return status;
  } catch (err) {
    console.warn('[CameraPermissions] requestCameraPermission error:', err);
    return PermissionStatus.DENIED;
  }
}

/**
 * Requests permission to access the device photo library.
 *
 * @returns {Promise<string>}  One of the {@link PermissionStatus} values.
 */
async function requestPhotoLibraryPermission() {
  try {
    const status = await _getAdapter().requestPhotoLibrary();
    return status;
  } catch (err) {
    console.warn(
      '[CameraPermissions] requestPhotoLibraryPermission error:',
      err
    );
    return PermissionStatus.DENIED;
  }
}

/**
 * Checks whether a permission result allows proceeding with the operation.
 *
 * @param {string} status  Value returned by request*Permission helpers.
 * @returns {boolean}
 */
function isPermissionGranted(status) {
  return status === PermissionStatus.GRANTED;
}

/**
 * Returns a user-friendly Vietnamese message for a denied/blocked permission.
 *
 * @param {'camera'|'photoLibrary'} permissionType
 * @param {string} status
 * @returns {string}
 */
function getPermissionDeniedMessage(permissionType, status) {
  const resource =
    permissionType === 'camera' ? 'Camera' : 'Thư viện ảnh';

  if (status === PermissionStatus.BLOCKED) {
    return (
      `${resource} bị chặn. Vui lòng mở Cài đặt và cấp quyền ` +
      `cho ứng dụng Nutri-Planner.`
    );
  }
  return `Ứng dụng cần quyền truy cập ${resource} để nhận diện món ăn.`;
}

module.exports = {
  PermissionStatus,
  setPermissionsAdapter,
  requestCameraPermission,
  requestPhotoLibraryPermission,
  isPermissionGranted,
  getPermissionDeniedMessage,
};

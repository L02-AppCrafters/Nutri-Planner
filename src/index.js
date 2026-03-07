/**
 * Nutri-Planner – public module entry point.
 *
 * Re-exports all public symbols that consumers of this package will need.
 */

const { recognizeFoodInImage } = require('./networking/imageRecognitionService');
const { compressImage, getSizeMB, MAX_SIZE_BYTES } = require('./utils/imageCompressor');
const {
  requestCameraPermission,
  requestPhotoLibraryPermission,
  isPermissionGranted,
  getPermissionDeniedMessage,
  setPermissionsAdapter,
  PermissionStatus,
} = require('./permissions/cameraPermissions');
const { NetworkError, buildNetworkError, ErrorCode } = require('./networking/networkErrors');
const { createHttpClient } = require('./networking/httpClient');

module.exports = {
  // Image recognition
  recognizeFoodInImage,

  // Image utilities
  compressImage,
  getSizeMB,
  MAX_SIZE_BYTES,

  // Permissions
  requestCameraPermission,
  requestPhotoLibraryPermission,
  isPermissionGranted,
  getPermissionDeniedMessage,
  setPermissionsAdapter,
  PermissionStatus,

  // Networking internals (useful for custom integrations)
  NetworkError,
  buildNetworkError,
  ErrorCode,
  createHttpClient,
};

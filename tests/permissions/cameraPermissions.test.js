const {
  PermissionStatus,
  setPermissionsAdapter,
  requestCameraPermission,
  requestPhotoLibraryPermission,
  isPermissionGranted,
  getPermissionDeniedMessage,
} = require('../../src/permissions/cameraPermissions');

describe('setPermissionsAdapter', () => {
  it('throws when adapter is missing requestCamera', () => {
    expect(() =>
      setPermissionsAdapter({ requestPhotoLibrary: async () => {} })
    ).toThrow(/requestCamera/i);
  });

  it('throws when adapter is missing requestPhotoLibrary', () => {
    expect(() =>
      setPermissionsAdapter({ requestCamera: async () => {} })
    ).toThrow(/requestPhotoLibrary/i);
  });

  it('accepts a valid adapter without throwing', () => {
    expect(() =>
      setPermissionsAdapter({
        requestCamera: async () => PermissionStatus.GRANTED,
        requestPhotoLibrary: async () => PermissionStatus.GRANTED,
      })
    ).not.toThrow();
  });
});

describe('requestCameraPermission', () => {
  it('returns GRANTED when adapter grants camera', async () => {
    setPermissionsAdapter({
      requestCamera: async () => PermissionStatus.GRANTED,
      requestPhotoLibrary: async () => PermissionStatus.DENIED,
    });
    const result = await requestCameraPermission();
    expect(result).toBe(PermissionStatus.GRANTED);
  });

  it('returns DENIED when adapter denies camera', async () => {
    setPermissionsAdapter({
      requestCamera: async () => PermissionStatus.DENIED,
      requestPhotoLibrary: async () => PermissionStatus.GRANTED,
    });
    const result = await requestCameraPermission();
    expect(result).toBe(PermissionStatus.DENIED);
  });

  it('returns DENIED when adapter throws', async () => {
    setPermissionsAdapter({
      requestCamera: async () => { throw new Error('native error'); },
      requestPhotoLibrary: async () => PermissionStatus.GRANTED,
    });
    const result = await requestCameraPermission();
    expect(result).toBe(PermissionStatus.DENIED);
  });
});

describe('requestPhotoLibraryPermission', () => {
  it('returns GRANTED when adapter grants photo library', async () => {
    setPermissionsAdapter({
      requestCamera: async () => PermissionStatus.DENIED,
      requestPhotoLibrary: async () => PermissionStatus.GRANTED,
    });
    const result = await requestPhotoLibraryPermission();
    expect(result).toBe(PermissionStatus.GRANTED);
  });

  it('returns DENIED when adapter throws', async () => {
    setPermissionsAdapter({
      requestCamera: async () => PermissionStatus.GRANTED,
      requestPhotoLibrary: async () => { throw new Error('native error'); },
    });
    const result = await requestPhotoLibraryPermission();
    expect(result).toBe(PermissionStatus.DENIED);
  });
});

describe('isPermissionGranted', () => {
  it('returns true only for GRANTED', () => {
    expect(isPermissionGranted(PermissionStatus.GRANTED)).toBe(true);
    expect(isPermissionGranted(PermissionStatus.DENIED)).toBe(false);
    expect(isPermissionGranted(PermissionStatus.BLOCKED)).toBe(false);
    expect(isPermissionGranted(PermissionStatus.UNAVAILABLE)).toBe(false);
  });
});

describe('getPermissionDeniedMessage', () => {
  it('mentions "Camera" for camera permission', () => {
    const msg = getPermissionDeniedMessage('camera', PermissionStatus.DENIED);
    expect(msg).toMatch(/Camera/);
  });

  it('mentions "Thư viện ảnh" for photo library permission', () => {
    const msg = getPermissionDeniedMessage('photoLibrary', PermissionStatus.DENIED);
    expect(msg).toMatch(/Thư viện ảnh/);
  });

  it('includes settings instruction when status is BLOCKED', () => {
    const msg = getPermissionDeniedMessage('camera', PermissionStatus.BLOCKED);
    expect(msg).toMatch(/Cài đặt/i);
  });
});

/**
 * Friendly, user-visible error messages for every network failure category
 * the image-recognition flow may encounter.
 */

const ErrorCode = {
  TIMEOUT: 'TIMEOUT',
  NO_NETWORK: 'NO_NETWORK',
  SERVER_ERROR: 'SERVER_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Converts a raw Axios / fetch error into a structured NetworkError with
 * a friendly message suitable for display to the end user.
 *
 * @param {Error} error  The raw error thrown by the HTTP client.
 * @returns {NetworkError}
 */
function buildNetworkError(error) {
  // --- Timeout ---
  if (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.message?.toLowerCase().includes('timeout')
  ) {
    return new NetworkError(
      ErrorCode.TIMEOUT,
      'Yêu cầu đã hết thời gian chờ. Vui lòng kiểm tra kết nối mạng và thử lại.',
      error
    );
  }

  // --- No network / DNS / connection refused ---
  if (
    error.code === 'ENOTFOUND' ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ERR_NETWORK' ||
    !error.response
  ) {
    return new NetworkError(
      ErrorCode.NO_NETWORK,
      'Không có kết nối mạng. Vui lòng kiểm tra Wi-Fi hoặc dữ liệu di động và thử lại.',
      error
    );
  }

  const status = error.response?.status;

  // --- HTTP 4xx (client errors) ---
  if (status >= 400 && status < 500) {
    const messages = {
      400: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra dữ liệu đầu vào.',
      401: 'Không có quyền truy cập. Vui lòng kiểm tra API key.',
      403: 'Truy cập bị từ chối. Tài khoản của bạn không có quyền sử dụng tính năng này.',
      404: 'Không tìm thấy tài nguyên yêu cầu.',
      413: 'Hình ảnh quá lớn. Vui lòng chọn hình ảnh nhỏ hơn.',
      429: 'Đã vượt quá giới hạn yêu cầu. Vui lòng thử lại sau ít phút.',
    };
    const message =
      messages[status] ||
      `Lỗi từ phía client (HTTP ${status}). Vui lòng thử lại.`;
    return new NetworkError(ErrorCode.CLIENT_ERROR, message, error, status);
  }

  // --- HTTP 5xx (server errors) ---
  if (status >= 500) {
    return new NetworkError(
      ErrorCode.SERVER_ERROR,
      `Máy chủ đang gặp sự cố (HTTP ${status}). Vui lòng thử lại sau.`,
      error,
      status
    );
  }

  // --- Catch-all ---
  return new NetworkError(
    ErrorCode.UNKNOWN,
    'Đã xảy ra lỗi không xác định. Vui lòng thử lại.',
    error
  );
}

/** Structured error object returned by every network failure. */
class NetworkError extends Error {
  /**
   * @param {string} code        One of the ErrorCode constants.
   * @param {string} userMessage Friendly Vietnamese message for the UI.
   * @param {Error}  cause       The original error for logging/debugging.
   * @param {number} [httpStatus]
   */
  constructor(code, userMessage, cause, httpStatus) {
    super(userMessage);
    this.name = 'NetworkError';
    this.code = code;
    this.userMessage = userMessage;
    this.cause = cause;
    this.httpStatus = httpStatus ?? null;
  }
}

module.exports = { NetworkError, buildNetworkError, ErrorCode };

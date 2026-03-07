const { NetworkError, buildNetworkError, ErrorCode } = require('../../src/networking/networkErrors');

describe('buildNetworkError', () => {
  describe('Timeout errors', () => {
    it('maps ECONNABORTED to TIMEOUT', () => {
      const raw = Object.assign(new Error('timeout of 15000ms exceeded'), {
        code: 'ECONNABORTED',
      });
      const err = buildNetworkError(raw);
      expect(err).toBeInstanceOf(NetworkError);
      expect(err.code).toBe(ErrorCode.TIMEOUT);
      expect(err.userMessage).toMatch(/hết thời gian chờ/i);
    });

    it('maps ETIMEDOUT to TIMEOUT', () => {
      const raw = Object.assign(new Error('etimedout'), { code: 'ETIMEDOUT' });
      const err = buildNetworkError(raw);
      expect(err.code).toBe(ErrorCode.TIMEOUT);
    });

    it('maps error message containing "timeout" to TIMEOUT', () => {
      const raw = new Error('Request timeout after 5s');
      const err = buildNetworkError(raw);
      expect(err.code).toBe(ErrorCode.TIMEOUT);
    });
  });

  describe('No-network errors', () => {
    it('maps ENOTFOUND to NO_NETWORK', () => {
      const raw = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
        code: 'ENOTFOUND',
      });
      const err = buildNetworkError(raw);
      expect(err.code).toBe(ErrorCode.NO_NETWORK);
      expect(err.userMessage).toMatch(/kết nối mạng/i);
    });

    it('maps ECONNREFUSED to NO_NETWORK', () => {
      const raw = Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
      });
      const err = buildNetworkError(raw);
      expect(err.code).toBe(ErrorCode.NO_NETWORK);
    });

    it('maps ERR_NETWORK to NO_NETWORK', () => {
      const raw = Object.assign(new Error('network error'), {
        code: 'ERR_NETWORK',
      });
      const err = buildNetworkError(raw);
      expect(err.code).toBe(ErrorCode.NO_NETWORK);
    });

    it('maps error without response to NO_NETWORK', () => {
      const raw = new Error('something went wrong');
      const err = buildNetworkError(raw);
      expect(err.code).toBe(ErrorCode.NO_NETWORK);
    });
  });

  describe('HTTP 4xx client errors', () => {
    const cases = [
      [400, /không hợp lệ/i],
      [401, /API key/i],
      [403, /từ chối/i],
      [404, /tìm thấy/i],
      [413, /quá lớn/i],
      [429, /giới hạn yêu cầu/i],
    ];

    test.each(cases)('HTTP %i → CLIENT_ERROR with appropriate message', (status, pattern) => {
      const raw = Object.assign(new Error(`Request failed with status ${status}`), {
        response: { status },
      });
      const err = buildNetworkError(raw);
      expect(err.code).toBe(ErrorCode.CLIENT_ERROR);
      expect(err.httpStatus).toBe(status);
      expect(err.userMessage).toMatch(pattern);
    });

    it('handles unknown 4xx with a generic message', () => {
      const raw = Object.assign(new Error('422'), { response: { status: 422 } });
      const err = buildNetworkError(raw);
      expect(err.code).toBe(ErrorCode.CLIENT_ERROR);
      expect(err.userMessage).toMatch(/HTTP 422/);
    });
  });

  describe('HTTP 5xx server errors', () => {
    const cases = [500, 502, 503, 504];

    test.each(cases)('HTTP %i → SERVER_ERROR', (status) => {
      const raw = Object.assign(new Error(`Server error ${status}`), {
        response: { status },
      });
      const err = buildNetworkError(raw);
      expect(err.code).toBe(ErrorCode.SERVER_ERROR);
      expect(err.httpStatus).toBe(status);
      expect(err.userMessage).toMatch(/máy chủ/i);
    });
  });

  describe('NetworkError structure', () => {
    it('exposes cause, name, and userMessage', () => {
      const raw = Object.assign(new Error('boom'), { code: 'ECONNABORTED' });
      const err = buildNetworkError(raw);
      expect(err.name).toBe('NetworkError');
      expect(err.cause).toBe(raw);
      expect(err.userMessage).toBeTruthy();
    });

    it('has null httpStatus for non-HTTP errors', () => {
      const raw = Object.assign(new Error('timeout'), { code: 'ECONNABORTED' });
      const err = buildNetworkError(raw);
      expect(err.httpStatus).toBeNull();
    });
  });
});

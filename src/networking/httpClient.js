/**
 * Shared Axios instance used by all networking modules.
 * - 15-second default timeout
 * - Response-error interceptor that wraps every failure in a NetworkError
 */

const axios = require('axios');
const { buildNetworkError } = require('./networkErrors');

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Creates an Axios instance pre-configured with timeout and error-mapping
 * interceptors.
 *
 * @param {number} [timeoutMs]  Override the default 15 s timeout.
 * @returns {import('axios').AxiosInstance}
 */
function createHttpClient(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const client = axios.create({ timeout: timeoutMs });

  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(buildNetworkError(error))
  );

  return client;
}

module.exports = { createHttpClient, DEFAULT_TIMEOUT_MS };

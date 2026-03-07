/**
 * Image Recognition Service
 *
 * Orchestrates the full flow:
 *   1. Compress the image to under 2 MB.
 *   2. Build a multipart HTTP POST with the compressed image.
 *   3. Send to the configured recognition endpoint (Google Cloud Vision or OpenAI).
 *   4. Return the raw response string on success.
 *   5. Propagate a NetworkError with a friendly message on failure.
 *
 * Configuration is read from environment variables:
 *   RECOGNITION_PROVIDER  – "google" | "openai"  (default: "openai")
 *   GOOGLE_VISION_API_KEY – required when RECOGNITION_PROVIDER=google
 *   OPENAI_API_KEY        – required when RECOGNITION_PROVIDER=openai
 *   RECOGNITION_TIMEOUT_MS – optional timeout override in ms (default: 15000)
 */

const FormData = require('form-data');
const { compressImage } = require('../utils/imageCompressor');
const { createHttpClient } = require('./httpClient');

// ── Provider URLs ──────────────────────────────────────────────────────────────

const GOOGLE_VISION_URL =
  'https://vision.googleapis.com/v1/images:annotate';

const OPENAI_VISION_URL = 'https://api.openai.com/v1/chat/completions';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Converts a Buffer to a base-64 string (used by Google Vision REST API).
 * @param {Buffer} buf
 * @returns {string}
 */
function bufferToBase64(buf) {
  return buf.toString('base64');
}

// ── Google Cloud Vision ────────────────────────────────────────────────────────

/**
 * Sends an image to Google Cloud Vision for LABEL_DETECTION.
 *
 * @param {Buffer} compressedBuffer  JPEG image buffer (≤ 2 MB).
 * @param {string} apiKey
 * @param {import('axios').AxiosInstance} client
 * @returns {Promise<string>}  Raw JSON response string.
 */
async function _sendToGoogleVision(compressedBuffer, apiKey, client) {
  const body = {
    requests: [
      {
        image: { content: bufferToBase64(compressedBuffer) },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
        ],
      },
    ],
  };

  const url = `${GOOGLE_VISION_URL}?key=${apiKey}`;
  const response = await client.post(url, body, {
    headers: { 'Content-Type': 'application/json' },
  });

  return JSON.stringify(response.data);
}

// ── OpenAI Vision ──────────────────────────────────────────────────────────────

/**
 * Sends an image to OpenAI's GPT-4o vision endpoint.
 *
 * @param {Buffer} compressedBuffer  JPEG image buffer (≤ 2 MB).
 * @param {string} apiKey
 * @param {import('axios').AxiosInstance} client
 * @returns {Promise<string>}  Raw JSON response string.
 */
async function _sendToOpenAI(compressedBuffer, apiKey, client) {
  const base64Image = bufferToBase64(compressedBuffer);

  const body = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'Identify the food items in this image. List each dish name and ' +
              'provide approximate nutritional information (calories, protein, ' +
              'carbohydrates, fat) per serving.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
        ],
      },
    ],
    max_tokens: 500,
  };

  const response = await client.post(OPENAI_VISION_URL, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return JSON.stringify(response.data);
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Recognizes the food in an image and returns the raw API response string.
 *
 * @param {Buffer}  imageBuffer           Raw image data (any sharp-supported format).
 * @param {object}  [config]              Override defaults for this call.
 * @param {string}  [config.provider]     "google" | "openai". Falls back to
 *                                        RECOGNITION_PROVIDER env var, then "openai".
 * @param {string}  [config.apiKey]       API key override. Falls back to env var.
 * @param {number}  [config.timeoutMs]    Request timeout in ms.
 * @param {object}  [config.compressOptions]  Passed to {@link compressImage}.
 * @returns {Promise<string>}  Raw JSON response string from the API.
 * @throws {NetworkError}  On any network / HTTP error.
 * @throws {Error}         If no API key is configured.
 */
async function recognizeFoodInImage(imageBuffer, config = {}) {
  const provider =
    config.provider ||
    process.env.RECOGNITION_PROVIDER ||
    'openai';

  const timeoutMs =
    config.timeoutMs ||
    (process.env.RECOGNITION_TIMEOUT_MS
      ? Number(process.env.RECOGNITION_TIMEOUT_MS)
      : undefined);

  // ── Compress image ────────────────────────────────────────────────────────
  const compressedBuffer = await compressImage(
    imageBuffer,
    config.compressOptions
  );

  // ── Dispatch to the configured provider ──────────────────────────────────
  const client = createHttpClient(timeoutMs);

  if (provider === 'google') {
    const apiKey =
      config.apiKey || process.env.GOOGLE_VISION_API_KEY || '';
    if (!apiKey) {
      throw new Error(
        'Google Vision API key is missing. ' +
          'Set the GOOGLE_VISION_API_KEY environment variable.'
      );
    }
    return _sendToGoogleVision(compressedBuffer, apiKey, client);
  }

  // Default: OpenAI
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
  if (!apiKey) {
    throw new Error(
      'OpenAI API key is missing. ' +
        'Set the OPENAI_API_KEY environment variable.'
    );
  }
  return _sendToOpenAI(compressedBuffer, apiKey, client);
}

module.exports = {
  recognizeFoodInImage,
  // Exported for unit testing
  _sendToGoogleVision,
  _sendToOpenAI,
  bufferToBase64,
};

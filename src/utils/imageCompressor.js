/**
 * Image compression utility.
 *
 * Compresses an image buffer so that it fits within MAX_SIZE_BYTES (default
 * 2 MB) before the file is sent to the recognition API.
 *
 * Uses the `sharp` library which is available on Node.js/server environments.
 * For React Native or browser environments this module should be swapped for a
 * platform-specific implementation (e.g. react-native-image-resizer or the Web
 * Canvas API) that exposes the same interface.
 */

const sharp = require('sharp');

/** Maximum allowed size in bytes (2 MB). */
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

/**
 * Compresses an image buffer to stay under MAX_SIZE_BYTES.
 *
 * The function tries progressively lower JPEG quality values until the output
 * fits within the size limit.  It always returns a JPEG buffer.
 *
 * @param {Buffer}  imageBuffer   Raw image data (any format sharp supports).
 * @param {object}  [options]
 * @param {number}  [options.maxSizeBytes=MAX_SIZE_BYTES]  Target max size.
 * @param {number}  [options.initialQuality=85]            Starting JPEG quality (1-100).
 * @param {number}  [options.qualityStep=10]               Quality reduction per iteration.
 * @param {number}  [options.minQuality=10]                Quality floor.
 * @returns {Promise<Buffer>}  Compressed image buffer (JPEG).
 * @throws {Error}             When compression cannot reach the target size even at minimum quality.
 */
async function compressImage(imageBuffer, options = {}) {
  const {
    maxSizeBytes = MAX_SIZE_BYTES,
    initialQuality = 85,
    qualityStep = 10,
    minQuality = 10,
  } = options;

  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error('imageBuffer must be a non-empty Buffer.');
  }

  let quality = initialQuality;

  while (quality >= minQuality) {
    const compressed = await sharp(imageBuffer).jpeg({ quality }).toBuffer();

    if (compressed.length <= maxSizeBytes) {
      return compressed;
    }

    quality -= qualityStep;
  }

  // Last attempt at minimum quality
  const finalAttempt = await sharp(imageBuffer)
    .jpeg({ quality: minQuality })
    .toBuffer();

  if (finalAttempt.length <= maxSizeBytes) {
    return finalAttempt;
  }

  throw new Error(
    `Không thể nén hình ảnh xuống dưới ${maxSizeBytes / (1024 * 1024)} MB. ` +
      `Vui lòng chọn hình ảnh nhỏ hơn.`
  );
}

/**
 * Returns the size of the compressed image in MB (two decimal places).
 *
 * @param {Buffer} buffer
 * @returns {string}  e.g. "1.23"
 */
function getSizeMB(buffer) {
  return (buffer.length / (1024 * 1024)).toFixed(2);
}

module.exports = { compressImage, getSizeMB, MAX_SIZE_BYTES };

const sharp = require('sharp');
const { compressImage, getSizeMB, MAX_SIZE_BYTES } = require('../../src/utils/imageCompressor');

/** Creates a synthetic JPEG buffer of approximately the given byte size. */
async function makeJpegBuffer(approxBytes = 512 * 1024) {
  // 1×1 white pixel – tiny but valid JPEG.  We'll repeat it to reach size.
  const pixel = await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .jpeg({ quality: 100 })
    .toBuffer();

  // Embed the pixel into a larger image so sharp actually has something to work with.
  const side = Math.ceil(Math.sqrt((approxBytes * 3) / 4));
  return sharp({
    create: {
      width: side,
      height: side,
      channels: 3,
      background: { r: 200, g: 150, b: 100 },
    },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
}

describe('compressImage', () => {
  it('throws when called with a non-Buffer value', async () => {
    await expect(compressImage('not-a-buffer')).rejects.toThrow(/non-empty Buffer/i);
  });

  it('throws when called with an empty Buffer', async () => {
    await expect(compressImage(Buffer.alloc(0))).rejects.toThrow(/non-empty Buffer/i);
  });

  it('returns a Buffer for a small input image', async () => {
    const input = await makeJpegBuffer(200 * 1024); // ~200 KB
    const output = await compressImage(input);
    expect(Buffer.isBuffer(output)).toBe(true);
    expect(output.length).toBeGreaterThan(0);
  });

  it('keeps output under maxSizeBytes', async () => {
    const input = await makeJpegBuffer(300 * 1024); // ~300 KB
    const maxSizeBytes = 1 * 1024 * 1024; // 1 MB limit for this test
    const output = await compressImage(input, { maxSizeBytes });
    expect(output.length).toBeLessThanOrEqual(maxSizeBytes);
  });

  it('honors custom initialQuality and qualityStep options', async () => {
    const input = await makeJpegBuffer(200 * 1024);
    // Low initial quality should produce a smaller result
    const output = await compressImage(input, { initialQuality: 20, qualityStep: 5 });
    expect(Buffer.isBuffer(output)).toBe(true);
  });

  it('returns a JPEG buffer (starts with FF D8)', async () => {
    const input = await makeJpegBuffer(200 * 1024);
    const output = await compressImage(input);
    expect(output[0]).toBe(0xff);
    expect(output[1]).toBe(0xd8);
  });
});

describe('getSizeMB', () => {
  it('returns a string representation of size in MB', () => {
    const buf = Buffer.alloc(1024 * 1024); // 1 MB
    expect(getSizeMB(buf)).toBe('1.00');
  });

  it('returns "0.50" for a 512 KB buffer', () => {
    const buf = Buffer.alloc(512 * 1024);
    expect(getSizeMB(buf)).toBe('0.50');
  });
});

describe('MAX_SIZE_BYTES', () => {
  it('equals 2 MB', () => {
    expect(MAX_SIZE_BYTES).toBe(2 * 1024 * 1024);
  });
});

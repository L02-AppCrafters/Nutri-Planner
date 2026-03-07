const MockAdapter = require('axios-mock-adapter');
const { createHttpClient } = require('../../src/networking/httpClient');
const {
  recognizeFoodInImage,
  _sendToGoogleVision,
  _sendToOpenAI,
  bufferToBase64,
} = require('../../src/networking/imageRecognitionService');
const { NetworkError, ErrorCode } = require('../../src/networking/networkErrors');

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Minimal 1×1 white JPEG buffer (valid JPEG magic bytes). */
const TINY_JPEG = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc0001108000100010301011100021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc40 0b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a929394959697989 99aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a9293949596979899 9aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00f87d28a2803fffd9',
  'hex'
);

// A more reliable tiny JPEG
const VALID_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

// ── bufferToBase64 ─────────────────────────────────────────────────────────────

describe('bufferToBase64', () => {
  it('converts a Buffer to a base-64 string', () => {
    const buf = Buffer.from('hello');
    expect(bufferToBase64(buf)).toBe('aGVsbG8=');
  });
});

// ── _sendToGoogleVision ────────────────────────────────────────────────────────

describe('_sendToGoogleVision', () => {
  let client;
  let mock;

  beforeEach(() => {
    client = createHttpClient(5000);
    mock = new MockAdapter(client);
  });

  afterEach(() => mock.restore());

  it('posts to the Google Vision URL with the API key as query param', async () => {
    const fakeResponse = { responses: [{ labelAnnotations: [] }] };
    mock
      .onPost(/vision\.googleapis\.com/)
      .reply(200, fakeResponse);

    const result = await _sendToGoogleVision(VALID_JPEG, 'TEST_KEY', client);
    expect(JSON.parse(result)).toEqual(fakeResponse);
  });

  it('includes image content as base64 in the request body', async () => {
    let capturedBody;
    mock.onPost(/vision\.googleapis\.com/).reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [200, {}];
    });

    await _sendToGoogleVision(VALID_JPEG, 'KEY', client);
    expect(capturedBody.requests[0].image.content).toBe(
      bufferToBase64(VALID_JPEG)
    );
  });

  it('propagates NetworkError on HTTP 403', async () => {
    mock.onPost(/vision\.googleapis\.com/).reply(403);
    await expect(_sendToGoogleVision(VALID_JPEG, 'KEY', client)).rejects.toMatchObject({
      code: ErrorCode.CLIENT_ERROR,
      httpStatus: 403,
    });
  });

  it('propagates NetworkError on server error', async () => {
    mock.onPost(/vision\.googleapis\.com/).reply(500);
    await expect(_sendToGoogleVision(VALID_JPEG, 'KEY', client)).rejects.toMatchObject({
      code: ErrorCode.SERVER_ERROR,
    });
  });
});

// ── _sendToOpenAI ──────────────────────────────────────────────────────────────

describe('_sendToOpenAI', () => {
  let client;
  let mock;

  beforeEach(() => {
    client = createHttpClient(5000);
    mock = new MockAdapter(client);
  });

  afterEach(() => mock.restore());

  it('posts to the OpenAI chat completions endpoint', async () => {
    const fakeResponse = { choices: [{ message: { content: 'Pizza' } }] };
    mock.onPost(/api\.openai\.com/).reply(200, fakeResponse);

    const result = await _sendToOpenAI(VALID_JPEG, 'sk-test', client);
    expect(JSON.parse(result)).toEqual(fakeResponse);
  });

  it('includes Authorization header with Bearer token', async () => {
    let capturedHeaders;
    mock.onPost(/api\.openai\.com/).reply((config) => {
      capturedHeaders = config.headers;
      return [200, {}];
    });

    await _sendToOpenAI(VALID_JPEG, 'sk-my-key', client);
    expect(capturedHeaders['Authorization']).toBe('Bearer sk-my-key');
  });

  it('includes image as base64 data URL in the request body', async () => {
    let capturedBody;
    mock.onPost(/api\.openai\.com/).reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [200, {}];
    });

    await _sendToOpenAI(VALID_JPEG, 'KEY', client);
    const content = capturedBody.messages[0].content;
    const imageContent = content.find((c) => c.type === 'image_url');
    expect(imageContent.image_url.url).toContain('data:image/jpeg;base64,');
    expect(imageContent.image_url.url).toContain(bufferToBase64(VALID_JPEG));
  });

  it('propagates NetworkError on timeout', async () => {
    mock.onPost(/api\.openai\.com/).timeout();
    await expect(_sendToOpenAI(VALID_JPEG, 'KEY', client)).rejects.toMatchObject({
      code: ErrorCode.TIMEOUT,
    });
  });

  it('propagates NetworkError on 429', async () => {
    mock.onPost(/api\.openai\.com/).reply(429);
    await expect(_sendToOpenAI(VALID_JPEG, 'KEY', client)).rejects.toMatchObject({
      code: ErrorCode.CLIENT_ERROR,
      httpStatus: 429,
    });
  });
});

// ── recognizeFoodInImage (integration-style) ───────────────────────────────────

describe('recognizeFoodInImage', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when no OpenAI API key is configured', async () => {
    delete process.env.OPENAI_API_KEY;
    // Use a real tiny JPEG so compression does not fail
    const sharp = require('sharp');
    const buf = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer();

    await expect(
      recognizeFoodInImage(buf, { provider: 'openai' })
    ).rejects.toThrow(/OpenAI API key/i);
  });

  it('throws when no Google Vision API key is configured', async () => {
    delete process.env.GOOGLE_VISION_API_KEY;
    const sharp = require('sharp');
    const buf = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer();

    await expect(
      recognizeFoodInImage(buf, { provider: 'google' })
    ).rejects.toThrow(/Google Vision API key/i);
  });
});

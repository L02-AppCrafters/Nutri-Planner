const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { createHttpClient } = require('../../src/networking/httpClient');
const { NetworkError, ErrorCode } = require('../../src/networking/networkErrors');

describe('createHttpClient', () => {
  let client;
  let mock;

  beforeEach(() => {
    client = createHttpClient(5000);
    mock = new MockAdapter(client);
  });

  afterEach(() => {
    mock.restore();
  });

  it('returns a successful response for HTTP 200', async () => {
    mock.onGet('/test').reply(200, { ok: true });
    const res = await client.get('/test');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true });
  });

  it('wraps a 401 in a NetworkError with CLIENT_ERROR code', async () => {
    mock.onGet('/auth').reply(401, { error: 'unauthorized' });
    await expect(client.get('/auth')).rejects.toMatchObject({
      name: 'NetworkError',
      code: ErrorCode.CLIENT_ERROR,
      httpStatus: 401,
    });
  });

  it('wraps a 500 in a NetworkError with SERVER_ERROR code', async () => {
    mock.onPost('/api').reply(500);
    await expect(client.post('/api')).rejects.toMatchObject({
      code: ErrorCode.SERVER_ERROR,
    });
  });

  it('wraps a network error (no response) in NetworkError with NO_NETWORK code', async () => {
    mock.onGet('/offline').networkError();
    await expect(client.get('/offline')).rejects.toMatchObject({
      code: ErrorCode.NO_NETWORK,
    });
  });

  it('wraps a timeout in a NetworkError with TIMEOUT code', async () => {
    mock.onGet('/slow').timeout();
    await expect(client.get('/slow')).rejects.toMatchObject({
      code: ErrorCode.TIMEOUT,
    });
  });
});

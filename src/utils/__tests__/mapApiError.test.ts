import { mapApiError } from '../mapApiError';

describe('mapApiError', () => {
  test('maps object error with message/statusCode/apiCode', () => {
    expect(mapApiError({ message: 'Nope', statusCode: 401, apiCode: 'ERR_UNAUTHORIZED' })).toEqual({
      message: 'Nope',
      statusCode: 401,
      apiCode: 'ERR_UNAUTHORIZED',
    });
  });

  test('handles string errors', () => {
    expect(mapApiError('boom')).toEqual({ message: 'boom' });
  });

  test('handles unknown values', () => {
    expect(mapApiError(null).message).toBeTruthy();
    expect(mapApiError(123).message).toBeTruthy();
  });
});


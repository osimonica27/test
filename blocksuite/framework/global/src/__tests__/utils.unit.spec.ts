import { describe, expect, test, vi } from 'vitest';

import { isEqual, serialThrottle } from '../utils.js';

describe('isEqual', () => {
  test('number', () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual(1, 114514)).toBe(false);
    expect(isEqual(NaN, NaN)).toBe(true);
    expect(isEqual(0, -0)).toBe(false);
  });

  test('string', () => {
    expect(isEqual('', '')).toBe(true);
    expect(isEqual('', ' ')).toBe(false);
  });

  test('array', () => {
    expect(isEqual([], [])).toBe(true);
    expect(isEqual([1, 1, 4, 5, 1, 4], [])).toBe(false);
    expect(isEqual([1, 1, 4, 5, 1, 4], [1, 1, 4, 5, 1, 4])).toBe(true);
  });

  test('object', () => {
    expect(isEqual({}, {})).toBe(true);
    expect(
      isEqual(
        {
          f: 1,
          g: {
            o: '',
          },
        },
        {
          f: 1,
          g: {
            o: '',
          },
        }
      )
    ).toBe(true);
    expect(isEqual({}, { foo: 1 })).toBe(false);
    // @ts-expect-error ignore
    expect(isEqual({ foo: 1 }, {})).toBe(false);
  });

  test('nested', () => {
    const nested = {
      string: 'this is a string',
      integer: 42,
      array: [19, 19, 810, 'test', NaN],
      nestedArray: [
        [1, 2],
        [3, 4],
      ],
      float: 114.514,
      undefined,
      object: {
        'first-child': true,
        'second-child': false,
        'last-child': null,
      },
      bigint: 110101195306153019n,
    };
    expect(isEqual(nested, nested)).toBe(true);
    // @ts-expect-error ignore
    expect(isEqual({ foo: [] }, { foo: '' })).toBe(false);
  });
});

describe('serialThrottle', () => {
  test('should execute function immediately if not running', async () => {
    const mock = vi.fn().mockResolvedValue('result');
    const throttled = serialThrottle(mock);

    const result = await throttled();

    expect(result).toBe('result');
    expect(mock).toHaveBeenCalledTimes(1);
  });

  test('should only keep last call while running', async () => {
    let resolve: (value: string) => void = () => {};
    const promise = new Promise<string>(r => (resolve = r));
    const mock = vi.fn().mockReturnValue(promise);
    const throttled = serialThrottle(mock);

    const firstCall = throttled();
    // Queue multiple calls while running
    throttled();
    throttled();
    const lastCall = throttled();

    // Complete first execution
    resolve('done');
    await firstCall;
    await lastCall;

    expect(mock).toHaveBeenCalledTimes(2);
  });
});

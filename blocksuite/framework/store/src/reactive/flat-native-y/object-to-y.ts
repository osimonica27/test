import type { Map as YMap } from 'yjs';

import { Boxed } from '../boxed';
import { isPureObject } from '../is-pure-object';
import { native2Y } from '../native-y';
import { Text } from '../text';
import type { CreateProxyOptions } from './types';
import {
  getFirstKey,
  getFullPath,
  keyWithoutPrefix,
  keyWithPrefix,
} from './utils';

// Handle object updates in YMap
export function syncObjectToYMap(
  value: object,
  fullPath: string,
  yMap: YMap<unknown>,
  options: Pick<CreateProxyOptions, 'initialized' | 'onChange'>
) {
  const list: Array<() => void> = [];
  const { initialized, onChange } = options;
  const firstKey = getFirstKey(fullPath);

  yMap.forEach((_, key) => {
    if (initialized() && keyWithoutPrefix(key).startsWith(fullPath)) {
      yMap.delete(key);
    }
  });

  const run = (obj: object, basePath: string) => {
    Object.entries(obj).forEach(([key, value]) => {
      const fullPath = getFullPath(basePath, key);
      if (isPureObject(value)) {
        run(value, fullPath);
      } else {
        list.push(() => {
          if (value instanceof Text || Boxed.is(value)) {
            value.bind(() => {
              onChange?.(firstKey, true);
            });
          }
          yMap.set(keyWithPrefix(fullPath), native2Y(value));
        });
      }
    });
  };

  run(value, fullPath);
  if (list.length && initialized()) {
    yMap.doc?.transact(
      () => {
        list.forEach(fn => fn());
      },
      { proxy: true }
    );
  }
}

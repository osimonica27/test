import type { Map as YMap } from 'yjs';

import { Boxed } from '../boxed';
import { isPureObject } from '../is-pure-object';
import { native2Y } from '../native-y';
import { Text } from '../text';
import type { UnRecord } from '../types';
import { syncObjectToYMap } from './object-to-y';
import { handleSignalUpdate } from './signal-handler';
import type { CreateProxyOptions } from './types';
import {
  getFirstKey,
  getFullPath,
  isProxy,
  keyWithPrefix,
  markProxy,
} from './utils';

function initializeNestedObjects(
  base: UnRecord,
  yMap: YMap<unknown>,
  root: UnRecord,
  options: CreateProxyOptions
): void {
  const { basePath } = options;
  Object.entries(base).forEach(([key, value]) => {
    if (isPureObject(value) && !isProxy(value)) {
      const proxy = createProxy(yMap, value as UnRecord, root, {
        ...options,
        basePath: basePath ? `${basePath}.${key}` : key,
      });
      base[key] = proxy;
    }
  });
}

export function createProxy(
  yMap: YMap<unknown>,
  base: UnRecord,
  root: UnRecord,
  options: CreateProxyOptions
): UnRecord {
  const {
    onDispose,
    shouldByPassSignal,
    shouldByPassYjs,
    byPassSignalUpdate,
    basePath,
    onChange,
    initialized,
    transform,
    stashed,
  } = options;
  const isRoot = !basePath;

  if (isProxy(base)) {
    return base;
  }

  initializeNestedObjects(base, yMap, root, options);

  const proxy = new Proxy(base, {
    has: (target: UnRecord, p: string | symbol) => Reflect.has(target, p),

    get: (target: UnRecord, p: string | symbol, receiver: unknown) =>
      Reflect.get(target, p, receiver),

    set: (
      target: UnRecord,
      p: string | symbol,
      value: unknown,
      receiver: unknown
    ) => {
      if (typeof p !== 'string') {
        return Reflect.set(target, p, value, receiver);
      }

      const fullPath = getFullPath(basePath, p);
      const firstKey = getFirstKey(fullPath);
      const isStashed = stashed.has(firstKey);

      if (isPureObject(value)) {
        if (!isStashed) {
          syncObjectToYMap(value as object, fullPath, yMap, {
            initialized,
            onChange,
          });
        }

        const next = createProxy(yMap, value as UnRecord, root, {
          ...options,
          basePath: fullPath,
        });

        const result = Reflect.set(target, p, next, receiver);
        handleSignalUpdate({
          shouldByPassSignal,
          byPassSignalUpdate,
          initialized,
          onDispose,
          onChange,
          root,
          firstKey,
          value: next,
          isRoot,
          proxy,
          key: p,
        });
        return result;
      }

      // Handle non-object values
      if (value instanceof Text || Boxed.is(value)) {
        value.bind(() => {
          onChange?.(firstKey, true);
        });
      }

      const yValue = native2Y(value);
      const next = transform(firstKey, value, yValue);

      if (!isStashed && initialized() && !shouldByPassYjs()) {
        yMap.doc?.transact(
          () => {
            yMap.set(keyWithPrefix(fullPath), yValue);
          },
          { proxy: true }
        );
      }

      const result = Reflect.set(target, p, next, receiver);
      handleSignalUpdate({
        shouldByPassSignal,
        byPassSignalUpdate,
        initialized,
        onDispose,
        onChange,
        root,
        firstKey,
        value: next,
        isRoot,
        proxy,
        key: p,
      });
      return result;
    },

    deleteProperty: (target: UnRecord, p: string | symbol) => {
      if (typeof p === 'string') {
        const fullPath = basePath ? `${basePath}.${p}` : p;
        const firstKey = getFirstKey(fullPath);
        const isStashed = stashed.has(firstKey);

        const updateSignal = () => {
          if (shouldByPassSignal()) {
            return;
          }

          const signalKey = `${firstKey}$`;
          if (!(signalKey in root)) {
            if (!isRoot) {
              return;
            }
            delete root[signalKey];
            return;
          }
          byPassSignalUpdate(() => {
            const prev = root[firstKey];
            const next = isRoot
              ? prev
              : isPureObject(prev)
                ? { ...prev }
                : Array.isArray(prev)
                  ? [...prev]
                  : prev;
            // @ts-expect-error allow magic props
            root[signalKey].value = next;
            onChange?.(firstKey, true);
          });
        };

        if (!isStashed && initialized() && !shouldByPassYjs()) {
          yMap.doc?.transact(
            () => {
              const fullKey = keyWithPrefix(fullPath);
              yMap.forEach((_, key) => {
                if (key.startsWith(fullKey)) {
                  yMap.delete(key);
                }
              });
            },
            { proxy: true }
          );
        }

        const result = Reflect.deleteProperty(target, p);
        updateSignal();
        return result;
      }
      return Reflect.deleteProperty(target, p);
    },
  });
  markProxy(proxy);
  return proxy;
}

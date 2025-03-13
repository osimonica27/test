import { signal } from '@preact/signals-core';

import { isPureObject } from '../is-pure-object';
import type { UnRecord } from '../types';
import type { CreateProxyOptions } from './types';

type SignalHandlerOptions = Pick<
  CreateProxyOptions,
  | 'shouldByPassSignal'
  | 'byPassSignalUpdate'
  | 'initialized'
  | 'onDispose'
  | 'onChange'
> & {
  root: UnRecord;
  firstKey: string;
  value: unknown;
  isRoot: boolean;
  proxy: UnRecord;
  key: string;
};

export function handleSignalUpdate(options: SignalHandlerOptions) {
  const {
    shouldByPassSignal,
    byPassSignalUpdate,
    initialized,
    onDispose,
    onChange,
    root,
    firstKey,
    value,
    isRoot,
    proxy,
    key,
  } = options;

  if (shouldByPassSignal()) {
    return;
  }

  const signalKey = `${firstKey}$`;

  if (!(signalKey in root)) {
    if (!isRoot) return;

    const signalData = signal(value);
    root[signalKey] = signalData;
    const unsubscribe = signalData.subscribe(next => {
      if (!initialized()) return;

      byPassSignalUpdate(() => {
        proxy[key] = next;
        onChange?.(firstKey, true);
      });
    });
    const subscription = onDispose.subscribe(() => {
      subscription.unsubscribe();
      unsubscribe();
    });
    return;
  }

  byPassSignalUpdate(() => {
    const prev = root[firstKey];
    const next = isRoot
      ? value
      : isPureObject(prev)
        ? // TODO: we should create proxy here
          { ...prev }
        : Array.isArray(prev)
          ? // TODO: we should create proxy here
            [...prev]
          : prev;
    // @ts-expect-error allow magic props
    root[signalKey].value = next;
    onChange?.(firstKey, true);
  });
}

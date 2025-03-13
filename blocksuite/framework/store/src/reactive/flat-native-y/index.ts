import { BlockSuiteError, ErrorCode } from '@blocksuite/global/exceptions';
import { signal } from '@preact/signals-core';
import type { Subject } from 'rxjs';
import {
  Array as YArray,
  Map as YMap,
  Text as YText,
  type YMapEvent,
} from 'yjs';

import { BaseReactiveYData } from '../base-reactive-data';
import { Boxed, type OnBoxedChange } from '../boxed';
import { y2Native } from '../native-y';
import { ReactiveYArray } from '../proxy';
import { type OnTextChange, Text } from '../text';
import type { ProxyOptions, UnRecord } from '../types';
import { createProxy } from './nested-proxy';
import type { OnChange } from './types';
import {
  deleteEmptyObject,
  getFirstKey,
  isEmptyObject,
  keyWithoutPrefix,
} from './utils';

export class ReactiveFlatYMap extends BaseReactiveYData<
  UnRecord,
  YMap<unknown>
> {
  protected readonly _proxy: UnRecord;
  protected readonly _source: UnRecord;
  protected readonly _options?: ProxyOptions<UnRecord>;

  private readonly _initialized;

  private readonly _observer = (event: YMapEvent<unknown>) => {
    const yMap = this._ySource;
    const proxy = this._proxy;
    this._onObserve(event, () => {
      event.keysChanged.forEach(key => {
        const type = event.changes.keys.get(key);
        if (!type) {
          return;
        }
        if (type.action === 'update' || type.action === 'add') {
          const value = yMap.get(key);
          const keyName: string = keyWithoutPrefix(key);
          const keys = keyName.split('.');
          const firstKey = getFirstKey(keyName);
          if (this._stashed.has(firstKey)) {
            return;
          }
          this._updateWithYjsSkip(() => {
            void keys.reduce((acc, key, index, arr) => {
              if (!acc[key] && index !== arr.length - 1) {
                acc[key] = {};
              }
              if (index === arr.length - 1) {
                acc[key] = y2Native(value, {
                  transform: (value, origin) => {
                    return this._transform(firstKey, value, origin);
                  },
                });
              }
              return acc[key] as UnRecord;
            }, proxy as UnRecord);
          });
          this._onChange?.(firstKey, false);
          return;
        }
        if (type.action === 'delete') {
          const keyName: string = keyWithoutPrefix(key);
          const keys = keyName.split('.');
          const firstKey = getFirstKey(keyName);
          if (this._stashed.has(firstKey)) {
            return;
          }
          this._updateWithYjsSkip(() => {
            void keys.reduce((acc, key, index) => {
              if (index === keys.length - 1) {
                delete acc[key];
                let curr = acc;
                let parentKey = keys[index - 1];
                let parent = proxy as UnRecord;
                let path = keys.slice(0, -2);

                for (let i = keys.length - 2; i > 0; i--) {
                  for (const pathKey of path) {
                    parent = parent[pathKey] as UnRecord;
                  }
                  if (!isEmptyObject(curr)) {
                    break;
                  }
                  deleteEmptyObject(curr, parentKey, parent);
                  curr = parent;
                  parentKey = keys[i - 1];
                  path = path.slice(0, -1);
                  parent = proxy as UnRecord;
                }
              }
              return acc[key] as UnRecord;
            }, proxy as UnRecord);
          });
          return;
        }
      });
    });
  };

  private readonly _transform = (
    key: string,
    value: unknown,
    origin: unknown
  ) => {
    const onChange = this._getPropOnChange(key);
    if (value instanceof Text) {
      value.bind(onChange as OnTextChange);
      return value;
    }
    if (Boxed.is(origin)) {
      (value as Boxed).bind(onChange as OnBoxedChange);
      return value;
    }
    if (origin instanceof YArray) {
      const data = new ReactiveYArray(value as unknown[], origin, {
        onChange,
      });
      return data.proxy;
    }

    return value;
  };

  private readonly _getPropOnChange = (key: string) => {
    return (_: unknown, isLocal: boolean) => {
      this._onChange?.(key, isLocal);
    };
  };

  private readonly _createDefaultData = (): UnRecord => {
    const root: UnRecord = {};
    const transform = this._transform;
    Array.from(this._ySource.entries()).forEach(([key, value]) => {
      if (key.startsWith('sys')) {
        return;
      }
      const keys = keyWithoutPrefix(key).split('.');
      const firstKey = getFirstKey(keyWithoutPrefix(key));

      let finalData = value;
      if (Boxed.is(value)) {
        finalData = transform(firstKey, new Boxed(value), value);
      } else if (value instanceof YArray) {
        finalData = transform(firstKey, value.toArray(), value);
      } else if (value instanceof YText) {
        const next = new Text(value);
        finalData = transform(firstKey, next, value);
      } else if (value instanceof YMap) {
        throw new BlockSuiteError(
          ErrorCode.ReactiveProxyError,
          'flatY2Native does not support Y.Map as value of Y.Map'
        );
      } else {
        finalData = transform(firstKey, value, value);
      }
      const allLength = keys.length;
      void keys.reduce((acc: UnRecord, key, index) => {
        if (!acc[key] && index !== allLength - 1) {
          const path = keys.slice(0, index + 1).join('.');
          const data = this._getProxy({} as UnRecord, root, path);
          acc[key] = data;
        }
        if (index === allLength - 1) {
          acc[key] = finalData;
        }
        return acc[key] as UnRecord;
      }, root);
    });

    return root;
  };

  private _byPassYjs = false;

  private readonly _getProxy = (
    source: UnRecord,
    root: UnRecord,
    path?: string
  ): UnRecord => {
    return createProxy(this._ySource, source, root, {
      onDispose: this._onDispose,
      shouldByPassSignal: () => this._skipNext,
      byPassSignalUpdate: this._updateWithSkip,
      shouldByPassYjs: () => this._byPassYjs,
      basePath: path,
      onChange: this._onChange,
      transform: this._transform,
      stashed: this._stashed,
      initialized: () => this._initialized,
    });
  };

  private readonly _updateWithYjsSkip = (fn: () => void) => {
    this._byPassYjs = true;
    fn();
    this._byPassYjs = false;
  };

  constructor(
    protected readonly _ySource: YMap<unknown>,
    private readonly _onDispose: Subject<void>,
    private readonly _onChange?: OnChange
  ) {
    super();
    this._initialized = false;
    const source = this._createDefaultData();
    this._source = source;

    const proxy = this._getProxy(source, source);

    Object.entries(source).forEach(([key, value]) => {
      const signalData = signal(value);
      source[`${key}$`] = signalData;
      const unsubscribe = signalData.subscribe(next => {
        if (!this._initialized) {
          return;
        }
        this._updateWithSkip(() => {
          proxy[key] = next;
          this._onChange?.(key, true);
        });
      });
      const subscription = _onDispose.subscribe(() => {
        subscription.unsubscribe();
        unsubscribe();
      });
    });

    this._proxy = proxy;
    this._ySource.observe(this._observer);
    this._initialized = true;
  }

  pop = (prop: string): void => {
    const value = this._source[prop];
    this._stashed.delete(prop);
    this._proxy[prop] = value;
  };

  stash = (prop: string): void => {
    this._stashed.add(prop);
  };
}

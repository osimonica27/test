import { SYS_KEYS } from '../../consts';
import type { UnRecord } from '../types';

export const keyWithoutPrefix = (key: string) => key.replace(/(prop|sys):/, '');

export const keyWithPrefix = (key: string) =>
  SYS_KEYS.has(key) ? `sys:${key}` : `prop:${key}`;

const proxySymbol = Symbol('proxy');

export function isProxy(value: unknown): boolean {
  return proxySymbol in Object.getPrototypeOf(value);
}

export function markProxy(value: UnRecord): UnRecord {
  Object.setPrototypeOf(value, {
    [proxySymbol]: true,
  });
  return value;
}

export function isEmptyObject(obj: UnRecord): boolean {
  return Object.keys(obj).length === 0;
}

export function deleteEmptyObject(
  obj: UnRecord,
  key: string,
  parent: UnRecord
): void {
  if (isEmptyObject(obj)) {
    delete parent[key];
  }
}

// Utility functions
export function getFirstKey(fullPath: string): string {
  const firstKey = fullPath.split('.')[0];
  if (!firstKey) {
    throw new Error(`Invalid key for: ${fullPath}`);
  }
  return firstKey;
}

export function getFullPath(basePath: string | undefined, key: string): string {
  return basePath ? `${basePath}.${key}` : key;
}

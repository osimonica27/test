import type { Subject } from 'rxjs';

export type OnChange = (key: string, isLocal: boolean) => void;
export type Transform = (
  key: string,
  value: unknown,
  origin: unknown
) => unknown;

export type CreateProxyOptions = {
  basePath?: string;
  onChange?: OnChange;
  transform: Transform;
  onDispose: Subject<void>;
  shouldByPassSignal: () => boolean;
  shouldByPassYjs: () => boolean;
  byPassSignalUpdate: (fn: () => void) => void;
  stashed: Set<string | number>;
  initialized: () => boolean;
};

import { type UserFriendlyError } from '@affine/error';
import {
  catchErrorInto,
  effect,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
  Service,
  smartRetry,
} from '@toeverything/infra';
import { EMPTY, exhaustMap, mergeMap } from 'rxjs';

import type { SelfhostGenerateLicenseStore } from '../stores/selfhost-generate-license';

export class SelfhostGenerateLicenseService extends Service {
  constructor(private readonly store: SelfhostGenerateLicenseStore) {
    super();
  }
  licenseKey$ = new LiveData<string | null>(null);
  isLoading$ = new LiveData(false);
  error$ = new LiveData<UserFriendlyError | null>(null);

  generateLicenseKey = effect(
    exhaustMap((sessionId: string) => {
      return fromPromise(async () => {
        return await this.store.generateKey(sessionId);
      }).pipe(
        smartRetry(),
        mergeMap(key => {
          this.licenseKey$.next(key);
          return EMPTY;
        }),
        catchErrorInto(this.error$),
        onStart(() => {
          this.isLoading$.next(true);
        }),
        onComplete(() => {
          this.isLoading$.next(false);
        })
      );
    })
  );
}

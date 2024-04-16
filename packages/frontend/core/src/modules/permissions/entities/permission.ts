import { DebugLogger } from '@affine/debug';
import type { WorkspaceService } from '@toeverything/infra';
import {
  backoffRetry,
  catchErrorInto,
  effect,
  Entity,
  fromPromise,
  LiveData,
  mapInto,
  onComplete,
  onStart,
} from '@toeverything/infra';
import { exhaustMap } from 'rxjs';

import { isBackendError, isNetworkError } from '../../cloud';
import type { WorkspacePermissionStoreService } from '../services/permission-store';

const logger = new DebugLogger('affine:workspace-permission');

export class WorkspacePermission extends Entity {
  isOwner$ = new LiveData<boolean | null>(null);
  isLoading$ = new LiveData(false);
  error$ = new LiveData<any>(null);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly store: WorkspacePermissionStoreService
  ) {
    super();
  }

  revalidate = effect(
    exhaustMap(() => {
      return fromPromise(signal =>
        this.store.fetchIsOwner(this.workspaceService.workspace.id, signal)
      ).pipe(
        backoffRetry({
          when: isNetworkError,
          count: Infinity,
        }),
        backoffRetry({
          when: isBackendError,
        }),
        mapInto(this.isOwner$),
        catchErrorInto(this.error$, error => {
          logger.error('Failed to fetch isOwner', error);
        }),
        onStart(() => this.isLoading$.setValue(true)),
        onComplete(() => this.isLoading$.setValue(false))
      );
    })
  );
}

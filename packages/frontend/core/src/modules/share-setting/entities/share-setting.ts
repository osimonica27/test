import { DebugLogger } from '@affine/debug';
import type { GetWorkspaceConfigQuery } from '@affine/graphql';
import type { WorkspaceService } from '@toeverything/infra';
import {
  backoffRetry,
  catchErrorInto,
  effect,
  Entity,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
} from '@toeverything/infra';
import { EMPTY, exhaustMap, mergeMap } from 'rxjs';

import { isBackendError, isNetworkError } from '../../cloud';
import type { WorkspaceShareSettingStore } from '../stores/share-setting';

type EnableAi = GetWorkspaceConfigQuery['workspace']['enableAi'];
type EnableShare = GetWorkspaceConfigQuery['workspace']['enableShare'];
type EnableUrlPreview =
  GetWorkspaceConfigQuery['workspace']['enableUrlPreview'];

const logger = new DebugLogger('affine:workspace-permission');

export class WorkspaceShareSetting extends Entity {
  enableAi$ = new LiveData<EnableAi | null>(null);
  enableShare$ = new LiveData<EnableShare | null>(null);
  enableUrlPreview$ = new LiveData<EnableUrlPreview | null>(null);
  isLoading$ = new LiveData(false);
  error$ = new LiveData<any>(null);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly store: WorkspaceShareSettingStore
  ) {
    super();
    this.revalidate();
  }

  revalidate = effect(
    exhaustMap(() => {
      return fromPromise(signal =>
        this.store.fetchWorkspaceConfig(
          this.workspaceService.workspace.id,
          signal
        )
      ).pipe(
        backoffRetry({
          when: isNetworkError,
          count: Infinity,
        }),
        backoffRetry({
          when: isBackendError,
          count: 3,
        }),
        mergeMap(value => {
          if (value) {
            this.enableAi$.next(value.enableAi);
            this.enableShare$.next(value.enableShare);
            this.enableUrlPreview$.next(value.enableUrlPreview);
          }
          return EMPTY;
        }),
        catchErrorInto(this.error$, error => {
          logger.error('Failed to fetch enableUrlPreview', error);
        }),
        onStart(() => this.isLoading$.setValue(true)),
        onComplete(() => this.isLoading$.setValue(false))
      );
    })
  );

  async waitForRevalidation(signal?: AbortSignal) {
    this.revalidate();
    await this.isLoading$.waitFor(isLoading => !isLoading, signal);
  }

  async setEnableUrlPreview(enableUrlPreview: EnableUrlPreview) {
    await this.store.updateWorkspaceEnableUrlPreview(
      this.workspaceService.workspace.id,
      enableUrlPreview
    );
    await this.waitForRevalidation();
  }

  override dispose(): void {
    this.revalidate.unsubscribe();
  }
}

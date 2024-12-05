import { DebugLogger } from '@affine/debug';
import type { Permission } from '@affine/graphql';
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
import type { WorkspacePermissionStore } from '../stores/permission';

const logger = new DebugLogger('affine:workspace-permission');

export class WorkspacePermission extends Entity {
  isOwner$ = new LiveData<boolean | null>(null);
  isAdmin$ = new LiveData<boolean | null>(null);
  isLoading$ = new LiveData(false);
  error$ = new LiveData<any>(null);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly store: WorkspacePermissionStore
  ) {
    super();
  }

  revalidate = effect(
    exhaustMap(() => {
      return fromPromise(async signal => {
        if (this.workspaceService.workspace.flavour !== 'local') {
          const isOwner = await this.store.fetchIsOwner(
            this.workspaceService.workspace.id,
            signal
          );
          const isAdmin = await this.store.fetchIsAdmin(
            this.workspaceService.workspace.id,
            signal
          );
          return { isOwner, isAdmin };
        } else {
          return { isOwner: true, isAdmin: false };
        }
      }).pipe(
        backoffRetry({
          when: isNetworkError,
          count: Infinity,
        }),
        backoffRetry({
          when: isBackendError,
        }),
        mergeMap(({ isOwner, isAdmin }) => {
          this.isAdmin$.next(isAdmin);
          this.isOwner$.next(isOwner);
          return EMPTY;
        }),
        catchErrorInto(this.error$, error => {
          logger.error('Failed to fetch isOwner', error);
        }),
        onStart(() => this.isLoading$.setValue(true)),
        onComplete(() => this.isLoading$.setValue(false))
      );
    })
  );

  async inviteMember(
    email: string,
    permission: Permission,
    sendInviteMail?: boolean
  ) {
    if (!this.isAdmin$.value && !this.isOwner$.value) {
      throw new Error('User has no permission to invite members');
    }
    return await this.store.inviteMember(
      this.workspaceService.workspace.id,
      email,
      permission,
      sendInviteMail
    );
  }

  async inviteMembers(emails: string[], sendInviteMail?: boolean) {
    if (!this.isAdmin$.value && !this.isOwner$.value) {
      throw new Error('User has no permission to invite members');
    }
    return await this.store.inviteBatch(
      this.workspaceService.workspace.id,
      emails,
      sendInviteMail
    );
  }

  async revokeMember(userId: string) {
    if (!this.isAdmin$.value && !this.isOwner$.value) {
      throw new Error('User has no permission to revoke members');
    }
    return await this.store.revokeMemberPermission(
      this.workspaceService.workspace.id,
      userId
    );
  }

  async acceptInvite(inviteId: string, sendAcceptMail?: boolean) {
    return await this.store.acceptInvite(
      this.workspaceService.workspace.id,
      inviteId,
      sendAcceptMail
    );
  }

  async approveMember(userId: string) {
    if (!this.isAdmin$.value && !this.isOwner$.value) {
      throw new Error('User has no permission to accept invite');
    }
    return await this.store.approveMember(
      this.workspaceService.workspace.id,
      userId
    );
  }

  async adjustMemberPermission(userId: string, permission: Permission) {
    if (!this.isAdmin$.value) {
      throw new Error('User has no permission to adjust member permissions');
    }
    return await this.store.adjustMemberPermission(
      this.workspaceService.workspace.id,
      userId,
      permission
    );
  }
}

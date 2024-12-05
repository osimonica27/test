import type { WorkspaceServerService } from '@affine/core/modules/cloud';
import {
  getIsAdminQuery,
  getIsOwnerQuery,
  leaveWorkspaceMutation,
} from '@affine/graphql';
import { Store } from '@toeverything/infra';

export class WorkspacePermissionStore extends Store {
  constructor(private readonly workspaceServerService: WorkspaceServerService) {
    super();
  }

  async fetchIsOwner(workspaceId: string, signal?: AbortSignal) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    const isOwner = await this.workspaceServerService.server.gql({
      query: getIsOwnerQuery,
      variables: {
        workspaceId,
      },
      context: { signal },
    });

    return isOwner.isOwner;
  }

  async fetchIsAdmin(workspaceId: string, signal?: AbortSignal) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    const isAdmin = await this.workspaceServerService.server.gql({
      query: getIsAdminQuery,
      variables: {
        workspaceId,
      },
      context: { signal },
    });

    return isAdmin.isAdmin;
  }

  /**
   * @param workspaceName for send email
   */
  async leaveWorkspace(workspaceId: string, workspaceName: string) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    await this.workspaceServerService.server.gql({
      query: leaveWorkspaceMutation,
      variables: {
        workspaceId,
        workspaceName,
      },
    });
  }
}

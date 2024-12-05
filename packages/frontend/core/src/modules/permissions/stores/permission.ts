import type { WorkspaceServerService } from '@affine/core/modules/cloud';
import {
  acceptInviteByInviteIdMutation,
  approveWorkspaceTeamMemberMutation,
  getIsAdminQuery,
  getIsOwnerQuery,
  grantWorkspaceTeamMemberMutation,
  inviteByEmailMutation,
  inviteByEmailsMutation,
  leaveWorkspaceMutation,
  type Permission,
  revokeMemberPermissionMutation,
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

  async inviteMember(
    workspaceId: string,
    email: string,
    permission: Permission,
    sendInviteMail = false
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    const invite = await this.workspaceServerService.server.gql({
      query: inviteByEmailMutation,
      variables: {
        workspaceId,
        email,
        permission,
        sendInviteMail,
      },
    });
    return invite.invite;
  }

  async inviteBatch(
    workspaceId: string,
    emails: string[],
    sendInviteMail = false
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    const inviteBatch = await this.workspaceServerService.server.gql({
      query: inviteByEmailsMutation,
      variables: {
        workspaceId,
        emails,
        sendInviteMail,
      },
    });
    return inviteBatch.inviteBatch;
  }

  async revokeMemberPermission(
    workspaceId: string,
    userId: string,
    signal?: AbortSignal
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    const revoke = await this.workspaceServerService.server.gql({
      query: revokeMemberPermissionMutation,
      variables: {
        workspaceId,
        userId,
      },
      context: { signal },
    });
    return revoke.revoke;
  }

  async acceptInvite(
    workspaceId: string,
    inviteId: string,
    sendAcceptMail = false
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    const accept = await this.workspaceServerService.server.gql({
      query: acceptInviteByInviteIdMutation,
      variables: {
        workspaceId,
        inviteId,
        sendAcceptMail,
      },
    });
    return accept.acceptInviteById;
  }

  async approveMember(workspaceId: string, userId: string) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    const member = await this.workspaceServerService.server.gql({
      query: approveWorkspaceTeamMemberMutation,
      variables: {
        workspaceId,
        userId,
      },
    });
    return member.approveMember;
  }

  async adjustMemberPermission(
    workspaceId: string,
    userId: string,
    permission: Permission
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    const member = await this.workspaceServerService.server.gql({
      query: grantWorkspaceTeamMemberMutation,
      variables: {
        workspaceId,
        userId,
        permission,
      },
    });
    return member.grantMember;
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

import { Injectable } from '@nestjs/common';
import { WorkspaceMemberStatus } from '@prisma/client';

import {
  DocAccessDenied,
  SpaceAccessDenied,
  SpaceOwnerNotFound,
} from '../../base';
import { Models } from '../../models';
import { Permission, PublicPageMode } from './types';

@Injectable()
export class PermissionService {
  constructor(private readonly models: Models) {}

  /// Start regin: workspace permission
  async get(ws: string, user: string) {
    const member = await this.models.workspace.getMember(ws, user);
    return member?.type;
  }

  /**
   * check whether a workspace exists and has any one can access it
   * @param workspaceId workspace id
   * @returns
   */
  async hasWorkspace(workspaceId: string) {
    const count = await this.models.workspace.getMemberUsedCount(workspaceId);
    return count > 0;
  }

  async getOwnedWorkspaces(userId: string) {
    return await this.models.workspace.findOwnedIds(userId);
  }

  async getWorkspaceOwner(workspaceId: string) {
    const owner = await this.models.workspace.getOwner(workspaceId);

    if (!owner) {
      throw new SpaceOwnerNotFound({ spaceId: workspaceId });
    }

    return owner.user;
  }

  async getWorkspaceAdmin(workspaceId: string) {
    const admins = await this.models.workspace.findAdmins(workspaceId);
    return admins.map(({ user }) => user);
  }

  async getWorkspaceMemberCount(workspaceId: string) {
    return await this.models.workspace.getMemberTotalCount(workspaceId);
  }

  async tryGetWorkspaceOwner(workspaceId: string) {
    return await this.models.workspace.getOwner(workspaceId);
  }

  /**
   * check if a doc binary is accessible by a user
   */
  async isPublicAccessible(
    ws: string,
    id: string,
    user?: string
  ): Promise<boolean> {
    if (ws === id) {
      // if workspace is public or have any public page, then allow to access
      const [isPublicWorkspace, publicPages] = await Promise.all([
        this.tryCheckWorkspace(ws, user, Permission.Read),
        this.models.workspacePage.getPublicsCount(ws),
      ]);
      return isPublicWorkspace || publicPages > 0;
    }

    return this.tryCheckPage(ws, id, user);
  }

  async getWorkspaceMemberStatus(ws: string, user: string) {
    const member = await this.models.workspace.getMemberInAnyStatus(ws, user);
    return member?.status;
  }

  /**
   * Returns whether a given user is a member of a workspace and has the given or higher permission.
   */
  async isWorkspaceMember(
    ws: string,
    user: string,
    permission: Permission = Permission.Read
  ): Promise<boolean> {
    return await this.models.workspace.isMember(ws, user, permission);
  }

  /**
   * only check permission if the workspace is a cloud workspace
   * @param workspaceId workspace id
   * @param userId user id, check if is a public workspace if not provided
   * @param permission default is read
   */
  async checkCloudWorkspace(
    workspaceId: string,
    userId?: string,
    permission: Permission = Permission.Read
  ) {
    const hasWorkspace = await this.hasWorkspace(workspaceId);
    if (hasWorkspace) {
      await this.checkWorkspace(workspaceId, userId, permission);
    }
  }

  async checkWorkspace(
    ws: string,
    user?: string,
    permission: Permission = Permission.Read
  ) {
    if (!(await this.tryCheckWorkspace(ws, user, permission))) {
      throw new SpaceAccessDenied({ spaceId: ws });
    }
  }

  async tryCheckWorkspace(
    ws: string,
    user?: string,
    permission: Permission = Permission.Read
  ) {
    // If the permission is read, we should check if the workspace is public
    if (permission === Permission.Read) {
      const workspace = await this.models.workspace.get(ws);
      // workspace is public
      // accessible
      if (workspace?.public) {
        return true;
      }
    }

    if (user) {
      // normally check if the user has the permission
      return await this.models.workspace.isMember(ws, user, permission);
    }

    // unsigned in, workspace is not public
    // unaccessible
    return false;
  }

  async checkWorkspaceIs(
    ws: string,
    user: string,
    permission: Permission = Permission.Read
  ) {
    if (!(await this.tryCheckWorkspaceIs(ws, user, permission))) {
      throw new SpaceAccessDenied({ spaceId: ws });
    }
  }

  async tryCheckWorkspaceIs(
    ws: string,
    user: string,
    permission: Permission = Permission.Read
  ) {
    const member = await this.models.workspace.getMember(ws, user);
    return member?.type === permission;
  }

  async allowUrlPreview(ws: string) {
    const workspace = await this.models.workspace.get(ws);
    return workspace?.enableUrlPreview ?? false;
  }

  async grant(
    ws: string,
    user: string,
    permission: Permission = Permission.Read,
    status: WorkspaceMemberStatus = WorkspaceMemberStatus.Pending
  ): Promise<string> {
    const member = await this.models.workspace.grantMember(
      ws,
      user,
      permission,
      status
    );
    return member.id;
  }

  async acceptWorkspaceInvitation(
    invitationId: string,
    workspaceId: string,
    status: WorkspaceMemberStatus = WorkspaceMemberStatus.Accepted
  ) {
    return await this.models.workspace.acceptMemberInvitation(
      invitationId,
      workspaceId,
      status
    );
  }

  async refreshSeatStatus(workspaceId: string, memberLimit: number) {
    await this.models.workspace.refreshMemberSeatStatus(
      workspaceId,
      memberLimit
    );
  }

  async revokeWorkspace(workspaceId: string, user: string) {
    return await this.models.workspace.deleteMember(workspaceId, user);
  }
  /// End region: workspace permission

  /// Start regin: page permission
  /**
   * only check permission if the workspace is a cloud workspace
   * @param workspaceId workspace id
   * @param pageId page id aka doc id
   * @param userId user id, check if is a public page if not provided
   * @param permission default is read
   */
  async checkCloudPagePermission(
    workspaceId: string,
    pageId: string,
    userId?: string,
    permission = Permission.Read
  ) {
    const hasWorkspace = await this.hasWorkspace(workspaceId);
    if (hasWorkspace) {
      await this.checkPagePermission(workspaceId, pageId, userId, permission);
    }
  }

  async checkPagePermission(
    ws: string,
    page: string,
    user?: string,
    permission = Permission.Read
  ) {
    if (!(await this.tryCheckPage(ws, page, user, permission))) {
      throw new DocAccessDenied({ spaceId: ws, docId: page });
    }
  }

  async tryCheckPage(
    ws: string,
    page: string,
    user?: string,
    permission = Permission.Read
  ) {
    // check whether page is public
    if (permission === Permission.Read) {
      const isPublic = await this.isPublicPage(ws, page);
      // page is public
      // accessible
      if (isPublic) {
        return true;
      }
    }

    if (user) {
      const isMember = await this.models.workspacePage.isMember(
        ws,
        page,
        user,
        permission
      );

      // page shared to user
      // accessible
      if (isMember) {
        return true;
      }
    }

    // check whether user has workspace related permission
    return this.tryCheckWorkspace(ws, user, permission);
  }

  async isPublicPage(ws: string, page: string) {
    const data = await this.models.workspacePage.get(ws, page, true);
    return !!data;
  }

  async publishPage(ws: string, page: string, mode = PublicPageMode.Page) {
    return await this.models.workspacePage.createOrUpdate(ws, page, {
      mode,
      public: true,
    });
  }

  async revokePublicPage(ws: string, page: string) {
    return await this.models.workspacePage.createOrUpdate(ws, page, {
      public: false,
    });
  }

  async grantPage(
    ws: string,
    page: string,
    user: string,
    permission: Permission = Permission.Read
  ) {
    const member = await this.models.workspacePage.grantMember(
      ws,
      page,
      user,
      permission
    );
    return member.id;
  }

  async revokePage(ws: string, page: string, user: string) {
    return await this.models.workspacePage.deleteMember(ws, page, user);
  }
  /// End regin: page permission
}

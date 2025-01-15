import { Injectable, Logger } from '@nestjs/common';
import {
  PrismaClient,
  type WorkspacePage,
  type WorkspacePageUserPermission,
} from '@prisma/client';

// TODO(fengmk2): move to these enum to a shared place? Like `src/shared/types/permission.ts`
import { Permission, PublicPageMode } from '../core/permission/types';

export type { WorkspacePage };
export type UpdateWorkspacePageInput = {
  mode?: PublicPageMode;
  public?: boolean;
};

@Injectable()
export class WorkspacePageModel {
  private readonly logger = new Logger(WorkspacePageModel.name);
  constructor(private readonly db: PrismaClient) {}

  // #region workspace page

  /**
   * Create or update the workspace page.
   */
  async createOrUpdate(
    workspaceId: string,
    pageId: string,
    data?: UpdateWorkspacePageInput
  ) {
    return await this.db.workspacePage.upsert({
      where: {
        workspaceId_pageId: {
          workspaceId,
          pageId,
        },
      },
      update: {
        ...data,
      },
      create: {
        ...data,
        workspaceId,
        pageId,
      },
    });
  }

  /**
   * Get the workspace page.
   * @param isPublic: if true, only return the public page. If false, only return the private page.
   * If not set, return public or private both.
   */
  async get(workspaceId: string, pageId: string, isPublic?: boolean) {
    return await this.db.workspacePage.findUnique({
      where: {
        workspaceId_pageId: {
          workspaceId,
          pageId,
        },
        public: isPublic,
      },
    });
  }

  /**
   * Find the workspace public pages.
   */
  async findPublics(workspaceId: string) {
    return await this.db.workspacePage.findMany({
      where: {
        workspaceId,
        public: true,
      },
    });
  }

  /**
   * Get the workspace public pages count.
   */
  async getPublicsCount(workspaceId: string) {
    return await this.db.workspacePage.count({
      where: {
        workspaceId,
        public: true,
      },
    });
  }

  // #endregion

  // #region workspace page member and permission

  /**
   * Grant the workspace page member with the given permission.
   */
  async grantMember(
    workspaceId: string,
    pageId: string,
    userId: string,
    permission: Permission = Permission.Read
  ): Promise<WorkspacePageUserPermission> {
    const data = await this.db.workspacePageUserPermission.findUnique({
      where: {
        workspaceId_pageId_userId: {
          workspaceId,
          pageId,
          userId,
        },
      },
    });

    if (!data) {
      // Create a new permission
      const created = await this.db.workspacePageUserPermission.create({
        data: {
          workspaceId,
          pageId,
          userId,
          type: permission,
          accepted: true,
        },
      });
      return created;
    }

    // If the user is already accepted and the new permission is owner, we need to revoke old owner
    if (data.type !== permission) {
      return await this.db.$transaction(async tx => {
        const updated = await tx.workspacePageUserPermission.update({
          where: {
            workspaceId_pageId_userId: {
              workspaceId,
              pageId,
              userId,
            },
          },
          data: { type: permission },
        });
        // If the new permission is owner, we need to revoke old owner
        if (permission === Permission.Owner) {
          await tx.workspacePageUserPermission.updateMany({
            where: {
              workspaceId,
              pageId,
              type: Permission.Owner,
              userId: { not: userId },
            },
            data: { type: Permission.Admin },
          });
          this.logger.log(
            `Change owner of workspace ${workspaceId} page ${pageId} to ${userId}`
          );
        }
        return updated;
      });
    }

    // nothing to do
    return data;
  }

  /**
   * Returns whether a given user is a member of a workspace and has the given or higher permission.
   * Default to read permission.
   */
  async isMember(
    workspaceId: string,
    pageId: string,
    userId: string,
    permission: Permission = Permission.Read
  ) {
    const count = await this.db.workspacePageUserPermission.count({
      where: {
        workspaceId,
        pageId,
        userId,
        type: {
          gte: permission,
        },
      },
    });
    return count > 0;
  }

  /**
   * Delete a workspace page member
   * Except the owner, the owner can't be deleted.
   */
  async deleteMember(workspaceId: string, pageId: string, userId: string) {
    const { count } = await this.db.workspacePageUserPermission.deleteMany({
      where: {
        workspaceId,
        pageId,
        userId,
        type: {
          // We shouldn't revoke owner permission, should auto deleted by workspace/user delete cascading
          not: Permission.Owner,
        },
      },
    });
    return count;
  }

  // #endregion
}

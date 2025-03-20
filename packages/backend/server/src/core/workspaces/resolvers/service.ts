import { Injectable, Logger } from '@nestjs/common';
import { getStreamAsBuffer } from 'get-stream';

import { Cache, JobQueue, NotFound, OnEvent, URLHelper } from '../../../base';
import {
  DEFAULT_WORKSPACE_AVATAR,
  DEFAULT_WORKSPACE_NAME,
  Models,
} from '../../../models';
import { DocReader } from '../../doc';
import { Mailer } from '../../mail';
import { WorkspaceRole } from '../../permission';
import { WorkspaceBlobStorage } from '../../storage';

export type InviteInfo = {
  workspaceId: string;
  inviterUserId?: string;
  inviteeUserId?: string;
};

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    private readonly cache: Cache,
    private readonly models: Models,
    private readonly url: URLHelper,
    private readonly doc: DocReader,
    private readonly blobStorage: WorkspaceBlobStorage,
    private readonly mailer: Mailer,
    private readonly queue: JobQueue
  ) {}

  async getInviteInfo(inviteId: string): Promise<InviteInfo> {
    // invite link
    const invite = await this.cache.get<InviteInfo>(
      `workspace:inviteLinkId:${inviteId}`
    );
    if (typeof invite?.workspaceId === 'string') {
      return invite;
    }

    const workspaceUser = await this.models.workspaceUser.getById(inviteId);

    if (!workspaceUser) {
      throw new NotFound('Invitation not found');
    }

    return {
      workspaceId: workspaceUser.workspaceId,
      inviteeUserId: workspaceUser.userId,
    };
  }

  async getWorkspaceInfo(workspaceId: string) {
    const workspaceContent = await this.doc.getWorkspaceContent(workspaceId);

    let avatar = DEFAULT_WORKSPACE_AVATAR;
    if (workspaceContent?.avatarKey) {
      const avatarBlob = await this.blobStorage.get(
        workspaceId,
        workspaceContent.avatarKey
      );

      if (avatarBlob.body) {
        avatar = (await getStreamAsBuffer(avatarBlob.body)).toString('base64');
      }
    }

    return {
      avatar,
      id: workspaceId,
      name: workspaceContent?.name ?? DEFAULT_WORKSPACE_NAME,
    };
  }

  async sendAcceptedEmail(inviteId: string) {
    const { workspaceId, inviterUserId, inviteeUserId } =
      await this.getInviteInfo(inviteId);

    const inviter = inviterUserId
      ? await this.models.user.getWorkspaceUser(inviterUserId)
      : await this.models.workspaceUser.getOwner(workspaceId);

    if (!inviter || !inviteeUserId) {
      this.logger.warn(
        `Inviter or invitee user not found for inviteId: ${inviteId}`
      );
      return false;
    }

    return await this.mailer.send({
      name: 'MemberAccepted',
      to: inviter.email,
      props: {
        user: {
          $$userId: inviteeUserId,
        },
        workspace: {
          $$workspaceId: workspaceId,
        },
      },
    });
  }

  async sendInvitationNotification(inviterId: string, inviteId: string) {
    await this.queue.add('notification.sendInvitation', {
      inviterId,
      inviteId,
    });
  }

  // ================ Team ================
  async isTeamWorkspace(workspaceId: string) {
    return this.models.workspaceFeature.has(workspaceId, 'team_plan_v1');
  }

  async sendTeamWorkspaceUpgradedEmail(workspaceId: string) {
    const owner = await this.models.workspaceUser.getOwner(workspaceId);
    const admins = await this.models.workspaceUser.getAdmins(workspaceId);

    const link = this.url.link(`/workspace/${workspaceId}`);
    await this.mailer.send({
      name: 'TeamWorkspaceUpgraded',
      to: owner.email,
      props: {
        workspace: {
          $$workspaceId: workspaceId,
        },
        isOwner: true,
        url: link,
      },
    });

    await Promise.allSettled(
      admins.map(async user => {
        await this.mailer.send({
          name: 'TeamWorkspaceUpgraded',
          to: user.email,
          props: {
            workspace: {
              $$workspaceId: workspaceId,
            },
            isOwner: false,
            url: link,
          },
        });
      })
    );
  }

  async sendReviewRequestedEmail(inviteId: string) {
    const { workspaceId, inviteeUserId } = await this.getInviteInfo(inviteId);
    if (!inviteeUserId) {
      this.logger.error(`Invitee user not found for inviteId: ${inviteId}`);
      return;
    }

    const owner = await this.models.workspaceUser.getOwner(workspaceId);
    const admins = await this.models.workspaceUser.getAdmins(workspaceId);

    await Promise.allSettled(
      [owner, ...admins].map(async receiver => {
        await this.mailer.send({
          name: 'LinkInvitationReviewRequest',
          to: receiver.email,
          props: {
            user: {
              $$userId: inviteeUserId,
            },
            workspace: {
              $$workspaceId: workspaceId,
            },
            url: this.url.link(`/workspace/${workspaceId}`),
          },
        });
      })
    );
  }

  async sendReviewApproveEmail(inviteId: string) {
    const invitation = await this.models.workspaceUser.getById(inviteId);
    if (!invitation) {
      this.logger.warn(`Invitation not found for inviteId: ${inviteId}`);
      return;
    }

    const user = await this.models.user.getWorkspaceUser(invitation.userId);

    if (!user) {
      this.logger.warn(`Invitee user not found for inviteId: ${inviteId}`);
      return;
    }

    await this.mailer.send({
      name: 'LinkInvitationApprove',
      to: user.email,
      props: {
        workspace: {
          $$workspaceId: invitation.workspaceId,
        },
        url: this.url.link(`/workspace/${invitation.workspaceId}`),
      },
    });
  }

  async sendReviewDeclinedEmail(email: string, workspaceId: string) {
    await this.mailer.send({
      name: 'LinkInvitationDecline',
      to: email,
      props: {
        workspace: {
          $$workspaceId: workspaceId,
        },
      },
    });
  }

  async sendRoleChangedEmail(
    userId: string,
    ws: { id: string; role: WorkspaceRole }
  ) {
    const user = await this.models.user.getWorkspaceUser(userId);
    if (!user) {
      this.logger.warn(
        `User not found for seeding role changed email: ${userId}`
      );
      return;
    }

    if (ws.role === WorkspaceRole.Admin) {
      await this.mailer.send({
        name: 'TeamBecomeAdmin',
        to: user.email,
        props: {
          workspace: {
            $$workspaceId: ws.id,
          },
          url: this.url.link(`/workspace/${ws.id}`),
        },
      });
    } else {
      await this.mailer.send({
        name: 'TeamBecomeCollaborator',
        to: user.email,
        props: {
          workspace: {
            $$workspaceId: ws.id,
          },
          url: this.url.link(`/workspace/${ws.id}`),
        },
      });
    }
  }

  async sendOwnershipTransferredEmail(email: string, ws: { id: string }) {
    await this.mailer.send({
      name: 'OwnershipTransferred',
      to: email,
      props: {
        workspace: {
          $$workspaceId: ws.id,
        },
      },
    });
  }

  async sendOwnershipReceivedEmail(email: string, ws: { id: string }) {
    await this.mailer.send({
      name: 'OwnershipReceived',
      to: email,
      props: {
        workspace: {
          $$workspaceId: ws.id,
        },
      },
    });
  }

  async sendLeaveEmail(workspaceId: string, userId: string) {
    const owner = await this.models.workspaceUser.getOwner(workspaceId);
    await this.mailer.send({
      name: 'MemberLeave',
      to: owner.email,
      props: {
        workspace: {
          $$workspaceId: workspaceId,
        },
        user: {
          $$userId: userId,
        },
      },
    });
  }

  @OnEvent('workspace.members.removed')
  async onMemberRemoved({
    userId,
    workspaceId,
  }: Events['workspace.members.removed']) {
    const user = await this.models.user.get(userId);
    if (!user) {
      this.logger.warn(
        `User not found for seeding member removed email: ${userId}`
      );
      return;
    }

    await this.mailer.send({
      name: 'MemberRemoved',
      to: user.email,
      props: {
        workspace: {
          $$workspaceId: workspaceId,
        },
      },
    });
  }
}

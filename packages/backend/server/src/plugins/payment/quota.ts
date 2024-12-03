import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { FeatureManagementService, FeatureType } from '../../core/features';
import {
  formatDate,
  formatSize,
  OneDay,
  OneGB,
  OneMB,
  QuotaBusinessType,
  QuotaOverride,
  QuotaOverrideService,
} from '../../core/quota';
import type { EventPayload } from '../../fundamentals';

@Injectable()
export class TeamQuotaOverride implements QuotaOverride {
  constructor(
    quotaOverride: QuotaOverrideService,
    private readonly manager: FeatureManagementService
  ) {
    quotaOverride.registerOverride(this);
  }

  get name() {
    return TeamQuotaOverride.name;
  }

  async overrideQuota(
    _ownerId: string,
    workspaceId: string,
    features: FeatureType[],
    orig: QuotaBusinessType
  ): Promise<QuotaBusinessType> {
    const config = await this.manager.getWorkspaceConfig(
      workspaceId,
      FeatureType.TeamWorkspace
    );
    if (features.includes(FeatureType.TeamWorkspace) && config) {
      const { seatStorage, maxMembers: memberLimit = 1 } = config;
      const blobLimit = 500 * OneMB;
      const storageQuota = 100 * OneGB + seatStorage * memberLimit;
      const historyPeriod = 30 * OneDay;
      return {
        ...orig,
        name: FeatureType.TeamWorkspace.toString(),
        storageQuota,
        blobLimit,
        businessBlobLimit: blobLimit,
        historyPeriod,
        memberLimit,
        humanReadable: {
          ...orig.humanReadable,
          name: 'Team',
          blobLimit: formatSize(blobLimit),
          storageQuota: formatSize(storageQuota),
          historyPeriod: formatDate(historyPeriod),
          memberLimit: memberLimit.toString(),
        },
      };
    }
    return orig;
  }

  @OnEvent('workspace.subscription.activated')
  async onSubscriptionUpdated({
    workspaceId,
    plan,
    recurring,
    quantity,
  }: EventPayload<'workspace.subscription.activated'>) {
    switch (plan) {
      case 'team':
        await this.manager.addTeamWorkspace(
          workspaceId,
          `${recurring} team subscription activated`
        );
        await this.manager.updateWorkspaceConfig(
          workspaceId,
          FeatureType.TeamWorkspace,
          { maxMembers: quantity }
        );
        break;
      default:
        break;
    }
  }

  @OnEvent('user.subscription.canceled')
  async onSubscriptionCanceled({
    workspaceId,
    plan,
  }: EventPayload<'workspace.subscription.canceled'>) {
    switch (plan) {
      case 'team':
        await this.manager.removeTeamWorkspace(workspaceId);
        break;
      default:
        break;
    }
  }
}

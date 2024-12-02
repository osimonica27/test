import { EventPayload } from '@affine/server/fundamentals';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  FeatureConfigType,
  FeatureManagementService,
  FeatureService,
  FeatureType,
} from '../../core/features';
import {
  formatSize,
  OneGB,
  OneMB,
  QuotaBusinessType,
  QuotaOverride,
  QuotaOverrideService,
} from '../../core/quota';

@Injectable()
export class TeamQuotaOverride implements QuotaOverride {
  private readonly teamFeature: Promise<
    FeatureConfigType<FeatureType.TeamWorkspace> | undefined
  >;

  constructor(
    feature: FeatureService,
    quotaOverride: QuotaOverrideService,
    private readonly manager: FeatureManagementService
  ) {
    quotaOverride.registerOverride(this);
    this.teamFeature = feature.getFeature(FeatureType.TeamWorkspace);
  }

  get name() {
    return TeamQuotaOverride.name;
  }

  async overrideQuota(
    _ownerId: string,
    _workspaceId: string,
    features: FeatureType[],
    orig: QuotaBusinessType
  ): Promise<QuotaBusinessType> {
    const feature = await this.teamFeature;
    if (features.includes(FeatureType.TeamWorkspace) && feature) {
      const seatStorage = feature.config.configs.seatStorage;
      const blobLimit = 500 * OneMB;
      // TODO: get member limit from subscription
      const memberLimit = orig.memberCount;
      const storageQuota = 100 * OneGB + seatStorage * memberLimit;
      return {
        ...orig,
        storageQuota,
        blobLimit,
        businessBlobLimit: blobLimit,
        memberLimit,
        humanReadable: {
          ...orig.humanReadable,
          name: 'Team',
          blobLimit: formatSize(blobLimit),
          storageQuota: formatSize(storageQuota),
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
        await this.manager.updateWorkspaceFeatureConfig(
          workspaceId,
          FeatureType.TeamWorkspace,
          { seatStorage: quantity }
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

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { QuotaManagementService, QuotaType } from '../../core/quota';
import type { EventPayload } from '../../fundamentals';

@Injectable()
export class TeamQuotaOverride {
  constructor(private readonly manager: QuotaManagementService) {}

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
          QuotaType.TeamPlanV1,
          { memberLimit: quantity }
        );
        break;
      default:
        break;
    }
  }

  @OnEvent('workspace.subscription.canceled')
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

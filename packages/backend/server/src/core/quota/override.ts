import { Injectable, Logger } from '@nestjs/common';

import type { QuotaBusinessType } from './types';

export abstract class QuotaOverride {
  abstract readonly name: string;
  abstract overrideQuota(
    ownerId: string,
    workspaceId: string,
    quota: QuotaBusinessType
  ): Promise<QuotaBusinessType>;
}

@Injectable()
export class QuotaOverrideService {
  private readonly logger = new Logger(QuotaOverrideService.name);
  private readonly overrides: QuotaOverride[] = [];

  registerOverride(override: QuotaOverride) {
    if (
      !this.overrides.includes(override) &&
      typeof override.overrideQuota === 'function'
    ) {
      this.overrides.push(override);
    }
  }

  async overrideQuota(
    ownerId: string,
    workspaceId: string,
    quota: QuotaBusinessType
  ): Promise<QuotaBusinessType> {
    let lastQuota = quota;
    for (const override of this.overrides) {
      try {
        const quota = await override.overrideQuota(
          ownerId,
          workspaceId,
          lastQuota
        );
        if (quota) {
          lastQuota = quota;
        }
      } catch (e) {
        this.logger.error(
          `Failed to override quota ${override.name} for workspace ${workspaceId}`,
          e
        );
      }
    }
    return lastQuota;
  }
}

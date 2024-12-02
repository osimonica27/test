import { z } from 'zod';

import { FeatureType } from './common';

export const featureTeamWorkspace = z.object({
  feature: z.literal(FeatureType.TeamWorkspace),
  configs: z.object({
    seatStorage: z.number(),
    maxMembers: z.number().optional(),
    enableAi: z.boolean().optional(),
    enableShare: z.boolean().optional(),
  }),
});

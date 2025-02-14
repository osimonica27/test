import { ServerService } from '@affine/core/modules/cloud';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { useLiveData, useService } from '@toeverything/infra';
import { Suspense, useCallback, useEffect, useState } from 'react';

import { AIOnboardingEdgeless } from './edgeless.dialog';
import { AIOnboardingLocal } from './local.dialog';
import { AIOnboardingType } from './type';

const useDismiss = (key: AIOnboardingType) => {
  const [dismiss, setDismiss] = useState(localStorage.getItem(key) === 'true');

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== key) return;
      setDismiss(localStorage.getItem(key) === 'true');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  const onDismiss = useCallback(() => {
    setDismiss(true);
    localStorage.setItem(key, 'true');
  }, [key]);

  return [dismiss, onDismiss] as const;
};

export const WorkspaceAIOnboarding = () => {
  const [dismissLocal] = useDismiss(AIOnboardingType.LOCAL);
  const featureFlagService = useService(FeatureFlagService);
  const serverService = useService(ServerService);
  const serverFeatures = useLiveData(serverService.server.features$);
  const enableAI =
    featureFlagService.flags.enable_ai.value && serverFeatures.copilot;

  return (
    <Suspense>
      {!enableAI || dismissLocal ? null : <AIOnboardingLocal />}
    </Suspense>
  );
};

export const PageAIOnboarding = () => {
  const [dismissEdgeless] = useDismiss(AIOnboardingType.EDGELESS);
  const featureFlagService = useService(FeatureFlagService);
  const serverService = useService(ServerService);
  const serverFeatures = useLiveData(serverService.server.features$);
  const enableAI =
    featureFlagService.flags.enable_ai.value && serverFeatures.copilot;

  return (
    <Suspense>
      {!enableAI || dismissEdgeless ? null : <AIOnboardingEdgeless />}
    </Suspense>
  );
};

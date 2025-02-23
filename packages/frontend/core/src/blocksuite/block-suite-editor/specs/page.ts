import { createAIPageRootBlockSpec } from '@affine/core/blocksuite/ai';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import {
  PageRootBlockSpec,
  type SpecBuilder,
  SpecProvider,
} from '@blocksuite/affine/blocks';
import { type FrameworkProvider } from '@toeverything/infra';

import { enableAffineExtension, enableAIExtension } from './custom/root-block';

export function createPageModeSpecs(framework: FrameworkProvider): SpecBuilder {
  const featureFlagService = framework.get(FeatureFlagService);
  const enableAI = featureFlagService.flags.enable_ai.value;
  const provider = SpecProvider._;
  const pageSpec = provider.getSpec('page');
  enableAffineExtension(framework, pageSpec);
  if (enableAI) {
    enableAIExtension(pageSpec);
    pageSpec.replace(PageRootBlockSpec, createAIPageRootBlockSpec(framework));
  }
  return pageSpec;
}

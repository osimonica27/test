import type { BlockModel } from '@blocksuite/store';

import { EmbedFigmaModel } from './figma';
import { EmbedGithubModel } from './github';
import type { EmbedHtmlModel } from './html';
import { EmbedLinkedDocModel } from './linked-doc';
import { EmbedLoomModel } from './loom';
import { EmbedSyncedDocModel } from './synced-doc';
import { EmbedYoutubeModel } from './youtube';

export const ExternalEmbedModels = [
  EmbedFigmaModel,
  EmbedGithubModel,
  EmbedLoomModel,
  EmbedYoutubeModel,
] as const;

export const InternalEmbedModels = [
  EmbedLinkedDocModel,
  EmbedSyncedDocModel,
] as const;

export type ExternalEmbedModel = (typeof ExternalEmbedModels)[number];

export type InternalEmbedModel = (typeof InternalEmbedModels)[number];

export type LinkableEmbedModel = InstanceType<
  ExternalEmbedModel | InternalEmbedModel
>;

export type BuiltInEmbedModel = LinkableEmbedModel | EmbedHtmlModel;

export function isExternalEmbedModel(
  model: BlockModel
): model is InstanceType<ExternalEmbedModel> {
  return (
    model instanceof EmbedFigmaModel ||
    model instanceof EmbedGithubModel ||
    model instanceof EmbedLoomModel ||
    model instanceof EmbedYoutubeModel
  );
}

export function isInternalEmbedModel(
  model: BlockModel
): model is InstanceType<InternalEmbedModel> {
  return (
    model instanceof EmbedLinkedDocModel || model instanceof EmbedSyncedDocModel
  );
}

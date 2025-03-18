import { EmbedIframeBlockSchema } from '@blocksuite/affine-model';
import { ToolbarModuleExtension } from '@blocksuite/affine-shared/services';
import { SlashMenuConfigExtension } from '@blocksuite/affine-widget-slash-menu';
import {
  BlockFlavourIdentifier,
  BlockViewExtension,
  FlavourExtension,
} from '@blocksuite/std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { EmbedIframeBlockAdapterExtensions } from './adapters';
import { embedIframeSlashMenuConfig } from './configs/slash-menu/slash-menu';
import { builtinToolbarConfig } from './configs/toolbar';

const flavour = EmbedIframeBlockSchema.model.flavour;

export const EmbedIframeBlockSpec: ExtensionType[] = [
  FlavourExtension(flavour),
  BlockViewExtension(flavour, model => {
    return model.parent?.flavour === 'affine:surface'
      ? literal`affine-embed-edgeless-iframe-block`
      : literal`affine-embed-iframe-block`;
  }),
  EmbedIframeBlockAdapterExtensions,
  ToolbarModuleExtension({
    id: BlockFlavourIdentifier(flavour),
    config: builtinToolbarConfig,
  }),
  SlashMenuConfigExtension(flavour, embedIframeSlashMenuConfig),
].flat();

import { NoteBlockSchema } from '@blocksuite/affine-model';
import { ToolbarModuleExtension } from '@blocksuite/affine-shared/services';
import {
  BlockFlavourIdentifier,
  BlockViewExtension,
  FlavourExtension,
} from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import {
  DocNoteBlockAdapterExtensions,
  EdgelessNoteBlockAdapterExtensions,
} from './adapters/index.js';
import { builtinToolbarConfig } from './configs/toolbar.js';
import { NoteBlockService } from './note-service.js';

const flavour = NoteBlockSchema.model.flavour;

export const NoteBlockSpec: ExtensionType[] = [
  FlavourExtension(flavour),
  NoteBlockService,
  BlockViewExtension(flavour, literal`affine-note`),
  DocNoteBlockAdapterExtensions,
  ToolbarModuleExtension({
    id: BlockFlavourIdentifier(flavour),
    config: builtinToolbarConfig,
  }),
].flat();

export const EdgelessNoteBlockSpec: ExtensionType[] = [
  FlavourExtension(flavour),
  NoteBlockService,
  BlockViewExtension(flavour, literal`affine-edgeless-note`),
  EdgelessNoteBlockAdapterExtensions,
  ToolbarModuleExtension({
    id: BlockFlavourIdentifier(flavour),
    config: builtinToolbarConfig,
  }),
].flat();

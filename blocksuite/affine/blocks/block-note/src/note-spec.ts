import { NoteBlockSchema } from '@blocksuite/affine-model';
import { BlockViewExtension, FlavourExtension } from '@blocksuite/std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import {
  DocNoteBlockAdapterExtensions,
  EdgelessNoteBlockAdapterExtensions,
} from './adapters/index.js';
import { NoteSlashMenuConfigExtension } from './configs/slash-menu.js';
import { NoteBlockService } from './note-service.js';

const flavour = NoteBlockSchema.model.flavour;

export const NoteBlockSpec: ExtensionType[] = [
  FlavourExtension(flavour),
  NoteBlockService,
  BlockViewExtension(flavour, literal`affine-note`),
  DocNoteBlockAdapterExtensions,
  NoteSlashMenuConfigExtension,
].flat();

export const EdgelessNoteBlockSpec: ExtensionType[] = [
  FlavourExtension(flavour),
  NoteBlockService,
  BlockViewExtension(flavour, literal`affine-edgeless-note`),
  EdgelessNoteBlockAdapterExtensions,
  NoteSlashMenuConfigExtension,
].flat();

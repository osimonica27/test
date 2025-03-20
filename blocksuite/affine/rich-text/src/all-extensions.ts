import type { AffineTextAttributes } from '@blocksuite/affine-shared/types';
import { InlineManagerExtension } from '@blocksuite/block-std/inline';
import type { ExtensionType } from '@blocksuite/store';

import {
  InlineAdapterExtensions,
  InlineSpecExtensions,
  MarkdownExtensions,
} from './inline/index.js';
import { LatexEditorInlineManagerExtension } from './inline/presets/nodes/latex-node/latex-editor-menu.js';

export const DefaultInlineManagerExtension =
  InlineManagerExtension<AffineTextAttributes>({
    id: 'DefaultInlineManager',
  });

export const RichTextExtensions: ExtensionType[] = [
  InlineSpecExtensions,
  MarkdownExtensions,
  LatexEditorInlineManagerExtension,
  DefaultInlineManagerExtension,
  InlineAdapterExtensions,
].flat();

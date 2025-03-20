import { inlineLinkExtensions } from '@blocksuite/affine-inline-link';
import { inlineReferenceExtensions } from '@blocksuite/affine-inline-reference';
import { FootNoteSchema } from '@blocksuite/affine-model';
import type { AffineTextAttributes } from '@blocksuite/affine-shared/types';
import { StdIdentifier } from '@blocksuite/block-std';
import {
  type InlineRootElement,
  InlineSpecExtension,
} from '@blocksuite/block-std/inline';
import type { ExtensionType } from '@blocksuite/store';
import { html } from 'lit';
import { z } from 'zod';

import { FootNoteNodeConfigIdentifier } from './nodes/footnote-node/footnote-config.js';

export type AffineInlineRootElement = InlineRootElement<AffineTextAttributes>;

export const BoldInlineSpecExtension =
  InlineSpecExtension<AffineTextAttributes>({
    name: 'bold',
    schema: z.literal(true).optional().nullable().catch(undefined),
    match: delta => {
      return !!delta.attributes?.bold;
    },
    renderer: ({ delta }) => {
      return html`<affine-text .delta=${delta}></affine-text>`;
    },
  });

export const ItalicInlineSpecExtension =
  InlineSpecExtension<AffineTextAttributes>({
    name: 'italic',
    schema: z.literal(true).optional().nullable().catch(undefined),
    match: delta => {
      return !!delta.attributes?.italic;
    },
    renderer: ({ delta }) => {
      return html`<affine-text .delta=${delta}></affine-text>`;
    },
  });

export const UnderlineInlineSpecExtension =
  InlineSpecExtension<AffineTextAttributes>({
    name: 'underline',
    schema: z.literal(true).optional().nullable().catch(undefined),
    match: delta => {
      return !!delta.attributes?.underline;
    },
    renderer: ({ delta }) => {
      return html`<affine-text .delta=${delta}></affine-text>`;
    },
  });

export const StrikeInlineSpecExtension =
  InlineSpecExtension<AffineTextAttributes>({
    name: 'strike',
    schema: z.literal(true).optional().nullable().catch(undefined),
    match: delta => {
      return !!delta.attributes?.strike;
    },
    renderer: ({ delta }) => {
      return html`<affine-text .delta=${delta}></affine-text>`;
    },
  });

export const CodeInlineSpecExtension =
  InlineSpecExtension<AffineTextAttributes>({
    name: 'code',
    schema: z.literal(true).optional().nullable().catch(undefined),
    match: delta => {
      return !!delta.attributes?.code;
    },
    renderer: ({ delta }) => {
      return html`<affine-text .delta=${delta}></affine-text>`;
    },
  });

export const BackgroundInlineSpecExtension =
  InlineSpecExtension<AffineTextAttributes>({
    name: 'background',
    schema: z.string().optional().nullable().catch(undefined),
    match: delta => {
      return !!delta.attributes?.background;
    },
    renderer: ({ delta }) => {
      return html`<affine-text .delta=${delta}></affine-text>`;
    },
  });

export const ColorInlineSpecExtension =
  InlineSpecExtension<AffineTextAttributes>({
    name: 'color',
    schema: z.string().optional().nullable().catch(undefined),
    match: delta => {
      return !!delta.attributes?.color;
    },
    renderer: ({ delta }) => {
      return html`<affine-text .delta=${delta}></affine-text>`;
    },
  });

export const LatexInlineSpecExtension =
  InlineSpecExtension<AffineTextAttributes>('latex', provider => {
    const std = provider.get(StdIdentifier);
    return {
      name: 'latex',
      schema: z.string().optional().nullable().catch(undefined),
      match: delta => typeof delta.attributes?.latex === 'string',
      renderer: ({ delta, selected, editor, startOffset, endOffset }) => {
        return html`<affine-latex-node
          .std=${std}
          .delta=${delta}
          .selected=${selected}
          .editor=${editor}
          .startOffset=${startOffset}
          .endOffset=${endOffset}
        ></affine-latex-node>`;
      },
      embed: true,
    };
  });

export const LatexEditorUnitSpecExtension =
  InlineSpecExtension<AffineTextAttributes>({
    name: 'latex-editor-unit',
    schema: z.undefined(),
    match: () => true,
    renderer: ({ delta }) => {
      return html`<latex-editor-unit .delta=${delta}></latex-editor-unit>`;
    },
  });

export const FootNoteInlineSpecExtension =
  InlineSpecExtension<AffineTextAttributes>('footnote', provider => {
    const std = provider.get(StdIdentifier);
    const config =
      provider.getOptional(FootNoteNodeConfigIdentifier) ?? undefined;
    return {
      name: 'footnote',
      schema: FootNoteSchema.optional().nullable().catch(undefined),
      match: delta => {
        return !!delta.attributes?.footnote;
      },
      renderer: ({ delta }) => {
        return html`<affine-footnote-node
          .delta=${delta}
          .std=${std}
          .config=${config}
        ></affine-footnote-node>`;
      },
      embed: true,
    };
  });

export const InlineSpecExtensions: ExtensionType[] = [
  BoldInlineSpecExtension,
  ItalicInlineSpecExtension,
  UnderlineInlineSpecExtension,
  StrikeInlineSpecExtension,
  CodeInlineSpecExtension,
  BackgroundInlineSpecExtension,
  ColorInlineSpecExtension,
  LatexInlineSpecExtension,
  ...inlineLinkExtensions,
  ...inlineReferenceExtensions,
  LatexEditorUnitSpecExtension,
  FootNoteInlineSpecExtension,
];

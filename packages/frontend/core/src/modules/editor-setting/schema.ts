import { GeneralSettingSchema } from '@blocksuite/affine/blocks';
import { z } from 'zod';

export const BSEditorSettingSchema = GeneralSettingSchema;

export type FontFamily = 'Sans' | 'Serif' | 'Mono' | 'Custom';
export type EdgelessDefaultTheme = 'auto' | 'dark' | 'light' | 'specified';

export const fontStyleOptions = [
  { key: 'Sans', value: 'var(--affine-font-sans-family)' },
  { key: 'Serif', value: 'var(--affine-font-serif-family)' },
  { key: 'Mono', value: 'var(--affine-font-mono-family)' },
  { key: 'Custom', value: 'var(--affine-font-sans-family)' },
] satisfies {
  key: FontFamily;
  value: string;
}[];

// Define type for keyboard shortcuts
export type KeyboardShortcut = string[];

// Define OS platform types
export type Platform = 'win' | 'mac';

// Base keyboard shortcuts schemas for different categories and platforms
export const KeyboardShortcutsSchema = z.object({
  // General shortcuts
  general: z.object({
    mac: z.record(z.string(), z.array(z.string())).default({}),
    win: z.record(z.string(), z.array(z.string())).default({}),
  }).default({}),
  // Page mode shortcuts
  page: z.object({
    mac: z.record(z.string(), z.array(z.string())).default({}),
    win: z.record(z.string(), z.array(z.string())).default({}),
  }).default({}),
  // Edgeless mode shortcuts
  edgeless: z.object({
    mac: z.record(z.string(), z.array(z.string())).default({}),
    win: z.record(z.string(), z.array(z.string())).default({}),
  }).default({}),
  // Markdown shortcuts (common for both platforms)
  markdown: z.record(z.string(), z.array(z.string())).default({}),
}).default({});

const AffineEditorSettingSchema = z.object({
  fontFamily: z.enum(['Sans', 'Serif', 'Mono', 'Custom']).default('Sans'),
  customFontFamily: z.string().default(''),
  newDocDefaultMode: z.enum(['edgeless', 'page', 'ask']).default('page'),
  fullWidthLayout: z.boolean().default(false),
  displayDocInfo: z.boolean().default(true),
  displayBiDirectionalLink: z.boolean().default(true),
  edgelessDefaultTheme: z
    .enum(['specified', 'dark', 'light', 'auto'])
    .default('specified'),
  // Add keyboard shortcuts to editor settings
  keyboardShortcuts: KeyboardShortcutsSchema.default({}),
});

export const EditorSettingSchema = BSEditorSettingSchema.merge(
  AffineEditorSettingSchema
);

// oxlint-disable-next-line no-redeclare
export type EditorSettingSchema = z.infer<typeof EditorSettingSchema>;

import { useI18n } from '@affine/i18n';
import { IS_MAC } from '@blocksuite/global/env';
import { 
  KeyboardShortcutsService,
  type ShortcutCategory
} from '@affine/core/modules/editor-setting';
import { useService } from '@toeverything/infra';
import { useCallback, useEffect, useMemo } from 'react';

type KeyboardShortcutsI18NKeys =
  | 'cancel'
  | 'quickSearch'
  | 'newPage'
  | 'appendDailyNote'
  | 'expandOrCollapseSidebar'
  | 'goBack'
  | 'goForward'
  | 'selectAll'
  | 'undo'
  | 'redo'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomTo100'
  | 'zoomToFit'
  | 'zoomToSelection'
  | 'select'
  | 'text'
  | 'shape'
  | 'image'
  | 'connector'
  | 'pen'
  | 'hand'
  | 'note'
  | 'group'
  | 'unGroup'
  | 'switch'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'inlineCode'
  | 'codeBlock'
  | 'link'
  | 'bodyText'
  | 'increaseIndent'
  | 'reduceIndent'
  | 'groupDatabase'
  | 'moveUp'
  | 'moveDown'
  | 'divider'
  | 'copy-private-link';

// TODO(550): remove this hook after 'useI18n' support scoped i18n
const useKeyboardShortcutsI18N = () => {
  const t = useI18n();
  return useCallback(
    (key: KeyboardShortcutsI18NKeys) =>
      t[`com.affine.keyboardShortcuts.${key}`](),
    [t]
  );
};

// TODO(550): remove this hook after 'useI18n' support scoped i18n
const useHeadingKeyboardShortcutsI18N = () => {
  const t = useI18n();
  return useCallback(
    (number: string) => t['com.affine.keyboardShortcuts.heading']({ number }),
    [t]
  );
};

interface ShortcutMap {
  [x: string]: string[];
}
export interface ShortcutsInfo {
  title: string;
  shortcuts: ShortcutMap;
}

/**
 * Hook to access keyboard shortcuts from the KeyboardShortcutsService
 */
const useCustomizableShortcuts = (category: ShortcutCategory): ShortcutMap => {
  const shortcutsService = useService(KeyboardShortcutsService);
  const [shortcuts, setShortcuts] = useMemo(() => {
    const initialShortcuts = shortcutsService.getShortcuts(category);
    return [initialShortcuts, {}];
  }, [shortcutsService, category]);

  // Initialize shortcuts if they don't exist yet
  useEffect(() => {
    shortcutsService.initializeShortcuts();
  }, [shortcutsService]);

  return shortcuts;
};

// Legacy functions for backward compatibility
export const useWinGeneralKeyboardShortcuts = (): ShortcutMap => {
  return useCustomizableShortcuts('general');
};

export const useMacGeneralKeyboardShortcuts = (): ShortcutMap => {
  return useCustomizableShortcuts('general');
};

export const useMacEdgelessKeyboardShortcuts = (): ShortcutMap => {
  return useCustomizableShortcuts('edgeless');
};

export const useWinEdgelessKeyboardShortcuts = (): ShortcutMap => {
  return useCustomizableShortcuts('edgeless');
};

export const useMacPageKeyboardShortcuts = (): ShortcutMap => {
  return useCustomizableShortcuts('page');
};

export const useWinPageKeyboardShortcuts = (): ShortcutMap => {
  return useCustomizableShortcuts('page');
};

export const useMacMarkdownShortcuts = (): ShortcutMap => {
  return useCustomizableShortcuts('markdown');
};

export const useWinMarkdownShortcuts = (): ShortcutMap => {
  return useCustomizableShortcuts('markdown');
};

// Use the appropriate shortcuts based on platform
const shortcutsMap = {
  useMarkdownShortcuts: useCustomizableShortcuts.bind(null, 'markdown'),
  usePageShortcuts: useCustomizableShortcuts.bind(null, 'page'),
  useEdgelessShortcuts: useCustomizableShortcuts.bind(null, 'edgeless'),
  useGeneralShortcuts: useCustomizableShortcuts.bind(null, 'general'),
};

export const useMarkdownShortcuts = (): ShortcutsInfo => {
  const t = useI18n();
  const shortcuts = shortcutsMap.useMarkdownShortcuts();

  return {
    title: t['com.affine.shortcutsTitle.markdownSyntax'](),
    shortcuts,
  };
};

export const usePageShortcuts = (): ShortcutsInfo => {
  const t = useI18n();
  const shortcuts = shortcutsMap.usePageShortcuts();

  return {
    title: t['com.affine.shortcutsTitle.page'](),
    shortcuts,
  };
};

export const useEdgelessShortcuts = (): ShortcutsInfo => {
  const t = useI18n();
  const shortcuts = shortcutsMap.useEdgelessShortcuts();

  return {
    title: t['com.affine.shortcutsTitle.edgeless'](),
    shortcuts,
  };
};

export const useGeneralShortcuts = (): ShortcutsInfo => {
  const t = useI18n();
  const shortcuts = shortcutsMap.useGeneralShortcuts();

  return {
    title: t['com.affine.shortcutsTitle.general'](),
    shortcuts,
  };
};

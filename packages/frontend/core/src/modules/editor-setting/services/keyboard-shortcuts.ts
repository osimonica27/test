import { IS_MAC } from '@blocksuite/global/env';
import { LiveData, Service } from '@toeverything/infra';
import { Observable, distinctUntilChanged, map } from 'rxjs';

import type { KeyboardShortcut, Platform } from '../schema';
import { EditorSettingService } from './editor-setting';

export type ShortcutCategory = 'general' | 'page' | 'edgeless' | 'markdown';

export interface ShortcutEntry {
  id: string;
  action: string;
  shortcut: KeyboardShortcut;
  category: ShortcutCategory;
  platform?: Platform;
}

export class KeyboardShortcutsService extends Service {
  constructor(private readonly editorSettingService: EditorSettingService) {
    super();
  }

  private readonly currentPlatform: Platform = IS_MAC ? 'mac' : 'win';

  /**
   * Get the current platform's shortcuts for a category
   */
  getShortcuts(category: ShortcutCategory) {
    const shortcuts = this.editorSettingService.editorSetting.keyboardShortcuts.value;

    if (category === 'markdown') {
      return shortcuts.markdown;
    }

    return shortcuts[category][this.currentPlatform];
  }

  /**
   * Watch for changes to shortcuts in a specific category
   */
  watchShortcuts(category: ShortcutCategory): Observable<Record<string, KeyboardShortcut>> {
    const shortcuts$ = this.editorSettingService.editorSetting.keyboardShortcuts.$;
    
    if (category === 'markdown') {
      return shortcuts$.pipe(
        map(shortcuts => shortcuts.markdown),
        distinctUntilChanged()
      );
    }

    return shortcuts$.pipe(
      map(shortcuts => shortcuts[category][this.currentPlatform]),
      distinctUntilChanged()
    );
  }

  /**
   * Set a shortcut in the specified category
   */
  setShortcut(category: ShortcutCategory, action: string, shortcut: KeyboardShortcut) {
    const shortcuts = this.editorSettingService.editorSetting.keyboardShortcuts.value;
    const updatedShortcuts = { ...shortcuts };

    if (category === 'markdown') {
      updatedShortcuts.markdown = {
        ...updatedShortcuts.markdown,
        [action]: shortcut,
      };
    } else {
      updatedShortcuts[category] = {
        ...updatedShortcuts[category],
        [this.currentPlatform]: {
          ...updatedShortcuts[category][this.currentPlatform],
          [action]: shortcut,
        },
      };
    }

    this.editorSettingService.editorSetting.keyboardShortcuts.set(updatedShortcuts);
  }

  /**
   * Reset a shortcut to its default value
   */
  resetShortcut(category: ShortcutCategory, action: string) {
    // Get default shortcuts from the default map
    const defaultShortcuts = this.getDefaultShortcuts();
    
    if (category === 'markdown') {
      const defaultShortcut = defaultShortcuts.markdown[action];
      if (defaultShortcut) {
        this.setShortcut(category, action, defaultShortcut);
      }
    } else {
      const defaultShortcut = defaultShortcuts[category][this.currentPlatform][action];
      if (defaultShortcut) {
        this.setShortcut(category, action, defaultShortcut);
      }
    }
  }

  /**
   * Reset all shortcuts to default values
   */
  resetAllShortcuts() {
    const defaultShortcuts = this.getDefaultShortcuts();
    this.editorSettingService.editorSetting.keyboardShortcuts.set(defaultShortcuts);
  }

  /**
   * Initialize shortcuts with default values if they don't exist
   */
  initializeShortcuts() {
    const shortcuts = this.editorSettingService.editorSetting.keyboardShortcuts.value;
    const defaultShortcuts = this.getDefaultShortcuts();

    // If shortcuts are empty, initialize with defaults
    if (Object.keys(shortcuts).length === 0) {
      this.editorSettingService.editorSetting.keyboardShortcuts.set(defaultShortcuts);
    }
  }

  /**
   * Get default shortcut map based on the current platform
   */
  private getDefaultShortcuts() {
    // This creates a structure that matches our schema
    return {
      general: {
        mac: {
          'cancel': ['ESC'],
          'quickSearch': ['⌘', 'K'],
          'newPage': ['⌘', 'N'],
          'expandOrCollapseSidebar': ['⌘', '/'],
          'goBack': ['⌘', '['],
          'goForward': ['⌘', ']'],
          'copy-private-link': ['⌘', '⇧', 'C'],
        },
        win: {
          'cancel': ['ESC'],
          'quickSearch': ['Ctrl', 'K'],
          'newPage': ['Ctrl', 'N'],
          'expandOrCollapseSidebar': ['Ctrl', '/'],
          'goBack': ['Ctrl', '['],
          'goForward': ['Ctrl', ']'],
          'copy-private-link': ['Ctrl', 'Shift', 'C'],
        }
      },
      page: {
        mac: {
          'undo': ['⌘', 'Z'],
          'redo': ['⌘', '⇧', 'Z'],
          'bold': ['⌘', 'B'],
          'italic': ['⌘', 'I'],
          'underline': ['⌘', 'U'],
          'strikethrough': ['⌘', '⇧', 'S'],
          'inlineCode': ['⌘', 'E'],
          'codeBlock': ['⌘', '⌥', 'C'],
          'link': ['⌘', 'K'],
          'bodyText': ['⌘', '⌥', '0'],
          'heading1': ['⌘', '⌥', '1'],
          'heading2': ['⌘', '⌥', '2'],
          'heading3': ['⌘', '⌥', '3'],
          'heading4': ['⌘', '⌥', '4'],
          'heading5': ['⌘', '⌥', '5'],
          'heading6': ['⌘', '⌥', '6'],
          'increaseIndent': ['Tab'],
          'reduceIndent': ['⇧', 'Tab'],
          'groupDatabase': ['⌘', 'G'],
          'switch': ['⌥', 'S'],
        },
        win: {
          'undo': ['Ctrl', 'Z'],
          'redo': ['Ctrl', 'Y'],
          'bold': ['Ctrl', 'B'],
          'italic': ['Ctrl', 'I'],
          'underline': ['Ctrl', 'U'],
          'strikethrough': ['Ctrl', 'Shift', 'S'],
          'inlineCode': ['Ctrl', 'E'],
          'codeBlock': ['Ctrl', 'Alt', 'C'],
          'link': ['Ctrl', 'K'],
          'bodyText': ['Ctrl', 'Shift', '0'],
          'heading1': ['Ctrl', 'Shift', '1'],
          'heading2': ['Ctrl', 'Shift', '2'],
          'heading3': ['Ctrl', 'Shift', '3'],
          'heading4': ['Ctrl', 'Shift', '4'],
          'heading5': ['Ctrl', 'Shift', '5'],
          'heading6': ['Ctrl', 'Shift', '6'],
          'increaseIndent': ['Tab'],
          'reduceIndent': ['Shift', 'Tab'],
          'groupDatabase': ['Ctrl', 'G'],
          'switch': ['Alt', 'S'],
        }
      },
      edgeless: {
        mac: {
          'selectAll': ['⌘', 'A'],
          'undo': ['⌘', 'Z'],
          'redo': ['⌘', '⇧', 'Z'],
          'zoomIn': ['⌘', '+'],
          'zoomOut': ['⌘', '-'],
          'zoomTo100': ['Alt', '0'],
          'zoomToFit': ['Alt', '1'],
          'zoomToSelection': ['Alt', '2'],
          'select': ['V'],
          'text': ['T'],
          'shape': ['S'],
          'image': ['I'],
          'connector': ['C'],
          'pen': ['P'],
          'hand': ['H'],
          'note': ['N'],
        },
        win: {
          'selectAll': ['Ctrl', 'A'],
          'undo': ['Ctrl', 'Z'],
          'redo': ['Ctrl', 'Y'],
          'zoomIn': ['Ctrl', '+'],
          'zoomOut': ['Ctrl', '-'],
          'zoomTo100': ['Alt', '0'],
          'zoomToFit': ['Alt', '1'],
          'zoomToSelection': ['Alt', '2'],
          'select': ['V'],
          'text': ['T'],
          'shape': ['S'],
          'image': ['I'],
          'connector': ['C'],
          'pen': ['P'],
          'hand': ['H'],
          'note': ['N'],
          'switch': ['Alt', ''],
        }
      },
      markdown: {
        'bold': ['**Text**'],
        'italic': ['*Text*'],
        'underline': ['~Text~'],
        'strikethrough': ['~~Text~~'],
        'divider': ['***'],
        'inlineCode': ['`Text`'],
        'codeBlock': ['```', 'Space'],
        'heading1': ['# Text'],
        'heading2': ['## Text'],
        'heading3': ['### Text'],
        'heading4': ['#### Text'],
        'heading5': ['##### Text'],
        'heading6': ['###### Text'],
      }
    };
  }

  /**
   * Check if a shortcut conflicts with existing shortcuts
   * @returns Array of conflicts found, empty if no conflicts
   */
  findConflicts(category: ShortcutCategory, action: string, shortcut: KeyboardShortcut): { category: ShortcutCategory, action: string }[] {
    const conflicts: { category: ShortcutCategory, action: string }[] = [];
    const shortcutStr = shortcut.join('-');
    
    const categories: ShortcutCategory[] = ['general', 'page', 'edgeless', 'markdown'];
    
    for (const cat of categories) {
      let shortcuts: Record<string, KeyboardShortcut>;
      
      if (cat === 'markdown') {
        shortcuts = this.getShortcuts(cat);
      } else {
        shortcuts = this.getShortcuts(cat);
      }
      
      for (const [act, sc] of Object.entries(shortcuts)) {
        // Skip the shortcut we're checking
        if (cat === category && act === action) continue;
        
        if (sc.join('-') === shortcutStr) {
          conflicts.push({ category: cat, action: act });
        }
      }
    }
    
    return conflicts;
  }
}
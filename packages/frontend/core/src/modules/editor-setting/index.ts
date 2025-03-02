import { type Framework } from '@toeverything/infra';

import { ServersService } from '../cloud';
import { DesktopApiService } from '../desktop-api';
import { I18n } from '../i18n';
import { GlobalState, GlobalStateService } from '../storage';
import { EditorSetting } from './entities/editor-setting';
import { CurrentUserDBEditorSettingProvider } from './impls/user-db';
import { EditorSettingProvider } from './provider/editor-setting-provider';
import { EditorSettingService } from './services/editor-setting';
import { KeyboardShortcutsService } from './services/keyboard-shortcuts';
import { SpellCheckSettingService } from './services/spell-check-setting';
export type { FontFamily, KeyboardShortcut, Platform } from './schema';
export { EditorSettingSchema, fontStyleOptions, KeyboardShortcutsSchema } from './schema';
export { EditorSettingService } from './services/editor-setting';
export { KeyboardShortcutsService } from './services/keyboard-shortcuts';
export type { ShortcutCategory, ShortcutEntry } from './services/keyboard-shortcuts';

export function configureEditorSettingModule(framework: Framework) {
  framework
    .service(EditorSettingService)
    .service(KeyboardShortcutsService, [EditorSettingService])
    .entity(EditorSetting, [EditorSettingProvider])
    .impl(EditorSettingProvider, CurrentUserDBEditorSettingProvider, [
      ServersService,
      GlobalState,
    ]);
}

export function configureSpellCheckSettingModule(framework: Framework) {
  framework.service(SpellCheckSettingService, [
    GlobalStateService,
    I18n,
    DesktopApiService,
  ]);
}

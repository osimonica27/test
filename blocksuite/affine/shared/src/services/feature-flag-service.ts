import { type Store, StoreExtension } from '@blocksuite/store';
import { type Signal, signal } from '@preact/signals-core';

export interface BlockSuiteFlags {
  enable_synced_doc_block: boolean;
  enable_pie_menu: boolean;
  enable_database_number_formatting: boolean;
  enable_database_attachment_note: boolean;
  enable_database_full_width: boolean;
  enable_block_query: boolean;
  enable_lasso_tool: boolean;
  enable_edgeless_text: boolean;
  enable_ai_onboarding: boolean;
  enable_ai_chat_block: boolean;
  enable_color_picker: boolean;
  enable_mind_map_import: boolean;
  enable_advanced_block_visibility: boolean;
  enable_shape_shadow_blur: boolean;
  enable_mobile_keyboard_toolbar: boolean;
  enable_mobile_linked_doc_menu: boolean;
}

export class FeatureFlagService extends StoreExtension {
  static override key = 'feature-flag-server';

  private readonly _flags: Signal<BlockSuiteFlags> = signal({
    enable_synced_doc_block: true,
    enable_pie_menu: false,
    enable_database_number_formatting: false,
    enable_database_attachment_note: false,
    enable_database_full_width: false,
    enable_block_query: false,
    enable_lasso_tool: false,
    enable_edgeless_text: true,
    enable_ai_onboarding: true,
    enable_ai_chat_block: true,
    enable_color_picker: true,
    enable_mind_map_import: true,
    enable_advanced_block_visibility: false,
    enable_shape_shadow_blur: false,
    enable_mobile_keyboard_toolbar: false,
    enable_mobile_linked_doc_menu: false,
  });

  setFlag(key: keyof BlockSuiteFlags, value: boolean) {
    this._flags.value = {
      ...this._flags.value,
      [key]: value,
    };
  }

  getFlag(key: keyof BlockSuiteFlags) {
    return this._flags.value[key];
  }

  constructor(store: Store) {
    super(store);
  }
}

import type { ColorScheme } from '@blocksuite/affine-model';
import {
  type ToolbarAction,
  ToolbarContext,
} from '@blocksuite/affine-shared/services';
import {
  PropTypes,
  requiredProperties,
  ShadowlessElement,
} from '@blocksuite/block-std';
import { SignalWatcher } from '@blocksuite/global/lit';
import { PaletteIcon } from '@blocksuite/icons/lit';
import {
  computed,
  type ReadonlySignal,
  type Signal,
} from '@preact/signals-core';
import { property } from 'lit/decorators.js';
import { html, type TemplateResult } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined.js';
import { repeat } from 'lit-html/directives/repeat.js';

import {
  EmbedCardDarkHorizontalIcon,
  EmbedCardDarkListIcon,
  EmbedCardLightHorizontalIcon,
  EmbedCardLightListIcon,
} from '../icons';

const cardStyleMap: Record<ColorScheme, Record<string, TemplateResult>> = {
  light: {
    horizontal: EmbedCardLightHorizontalIcon,
    list: EmbedCardLightListIcon,
  },
  dark: {
    horizontal: EmbedCardDarkHorizontalIcon,
    list: EmbedCardDarkListIcon,
  },
};

@requiredProperties({
  actions: PropTypes.array,
  context: PropTypes.instanceOf(ToolbarContext),
  style$: PropTypes.object,
})
export class CardStyleDropdownMenu extends SignalWatcher(ShadowlessElement) {
  @property({ attribute: false })
  accessor actions!: ToolbarAction[];

  @property({ attribute: false })
  accessor context!: ToolbarContext;

  @property({ attribute: false })
  accessor style$!: Signal<string> | ReadonlySignal<string>;

  @property({ attribute: false })
  accessor toggle: ((e: CustomEvent<boolean>) => void) | undefined;

  icons$ = computed(
    () => cardStyleMap[this.context.themeProvider.theme$.value]
  );

  override render() {
    const {
      actions,
      context,
      toggle,
      style$: { value: style },
      icons$: { value: icons },
    } = this;

    return html`
      <editor-menu-button
        @toggle=${toggle}
        .contentPadding="${'8px'}"
        .button=${html`
          <editor-icon-button
            aria-label="Card style"
            .tooltip="${'Card style'}"
          >
            ${PaletteIcon()}
          </editor-icon-button>
        `}
      >
        <div>
          ${repeat(
            actions,
            action => action.id,
            ({ id, label, icon, disabled, run }) => html`
              <editor-icon-button
                aria-label="${label}"
                data-testid="${id}"
                .tooltip="${label}"
                .activeMode="${'border'}"
                .iconContainerWidth="${'76px'}"
                .iconContainerHeight="${'76px'}"
                ?active="${id === style}"
                ?disabled="${ifDefined(disabled)}"
                @click=${() => run?.(context)}
              >
                ${icon || icons[id]}
              </editor-icon-button>
            `
          )}
        </div>
      </editor-menu-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-card-style-dropdown-menu': CardStyleDropdownMenu;
  }
}

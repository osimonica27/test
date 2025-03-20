import {
  adjustColorAlpha,
  keepColor,
} from '@blocksuite/affine-components/color-picker';
import { DefaultTheme } from '@blocksuite/affine-model';
import {
  EditPropsStore,
  FeatureFlagService,
  ThemeProvider,
} from '@blocksuite/affine-shared/services';
import type { ColorEvent } from '@blocksuite/affine-shared/utils';
import type { GfxToolsFullOptionValue } from '@blocksuite/block-std/gfx';
import { SignalWatcher } from '@blocksuite/global/lit';
import { computed, type Signal } from '@preact/signals-core';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { EdgelessToolbarToolMixin } from '../mixins/tool.mixin.js';
import { penMap } from './config';

export class EdgelessPenMenu extends EdgelessToolbarToolMixin(
  SignalWatcher(LitElement)
) {
  static override styles = css`
    :host {
      display: flex;
      position: absolute;
      z-index: -1;
    }

    .pens {
      position: fixed;
      display: flex;

      .pen-wrapper {
        display: flex;
        height: 64px;
        align-items: flex-end;
        justify-content: center;
        position: relative;
        transform: translateY(10px);
        transition: transform 0.3s ease-in-out;
        cursor: pointer;
      }

      .pen-wrapper:hover,
      .pen-wrapper:active,
      .pen-wrapper[data-active] {
        transform: translateY(-10px);
      }
    }

    .menu-content {
      display: flex;
      align-items: center;
    }

    menu-divider {
      height: 24px;
      margin: 0 9px 0 70px;
    }
  `;

  private readonly _brushColor$ = computed(() => {
    const theme = this._theme$.value;
    const color =
      this.edgeless.std.get(EditPropsStore).lastProps$.value.brush.color;
    return keepColor(
      this.edgeless.std
        .get(ThemeProvider)
        .generateColorProperty(color, undefined, theme)
    );
  });

  private readonly _highlighterColor$ = computed(() => {
    const theme = this._theme$.value;
    const color =
      this.edgeless.std.get(EditPropsStore).lastProps$.value.highlighter.color;
    return keepColor(
      this.edgeless.std
        .get(ThemeProvider)
        .generateColorProperty(color, undefined, theme)
    );
  });

  private readonly _currentColor$ = computed(() => {
    if (this.pen$.value === 'brush') {
      return this._brushColor$.value;
    }
    return this._highlighterColor$.value;
  });

  private readonly _appTheme$ = computed(() => {
    return this.edgeless.std.get(ThemeProvider).app$.value;
  });

  private readonly _theme$ = computed(() => {
    return this.edgeless.std.get(ThemeProvider).theme$.value;
  });

  private readonly _onPickPen = (
    tool: Extract<GfxToolsFullOptionValue['type'], 'brush' | 'highlighter'>
  ) => {
    this.pen$.value = tool;
    this.setEdgelessTool(tool);
  };

  private readonly _onPickColor = (e: ColorEvent) => {
    let color = e.detail.value;
    if (this.pen$.peek() === 'highlighter') {
      color = adjustColorAlpha(color, 0.5);
    }
    this.onChange({ color });
  };

  override type: GfxToolsFullOptionValue['type'][] = ['brush', 'highlighter'];

  override render() {
    const {
      _theme$: { value: theme },
      _appTheme$: { value: appTheme },
      _brushColor$: { value: brushColor },
      _highlighterColor$: { value: highlighterColor },
      _currentColor$: { value: currentColor },
    } = this;
    const isBrush = this.pen$.value === 'brush';
    const pens = penMap[appTheme];

    return html`
      <edgeless-slide-menu>
        <div class="menu-content">
          <div class="pens">
            <div
              class="pen-wrapper"
              ?data-active=${isBrush}
              style=${styleMap({ color: brushColor })}
              @click=${() => this._onPickPen('brush')}
            >
              ${pens.brush}
            </div>
            <div
              class="pen-wrapper"
              ?data-active=${!isBrush}
              style=${styleMap({ color: highlighterColor })}
              @click=${() => this._onPickPen('highlighter')}
            >
              ${pens.highlighter}
            </div>
          </div>
          <menu-divider .vertical=${true}></menu-divider>
          <edgeless-color-panel
            class="one-way"
            .value=${currentColor}
            .theme=${theme}
            .palettes=${DefaultTheme.StrokeColorShortPalettes}
            .shouldKeepColor=${true}
            .hasTransparent=${!this.edgeless.doc
              .get(FeatureFlagService)
              .getFlag('enable_color_picker')}
            @select=${this._onPickColor}
          ></edgeless-color-panel>
        </div>
      </edgeless-slide-menu>
    `;
  }

  @property({ attribute: false })
  accessor onChange!: (props: Record<string, unknown>) => void;

  @property({ attribute: false })
  accessor pen$!: Signal<
    Extract<GfxToolsFullOptionValue['type'], 'brush' | 'highlighter'>
  >;
}

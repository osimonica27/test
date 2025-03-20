import {
  EditPropsStore,
  ThemeProvider,
} from '@blocksuite/affine-shared/services';
import type { GfxToolsFullOptionValue } from '@blocksuite/block-std/gfx';
import { SignalWatcher } from '@blocksuite/global/lit';
import { computed, signal } from '@preact/signals-core';
import { css, html, LitElement } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';

import { EdgelessToolbarToolMixin } from '../mixins/tool.mixin.js';
import { penMap } from './config.js';

export class EdgelessPenToolButton extends EdgelessToolbarToolMixin(
  SignalWatcher(LitElement)
) {
  static override styles = css`
    :host {
      display: flex;
      height: 100%;
      overflow-y: hidden;
    }
    .edgeless-pen-button {
      height: 100%;
    }
    .pen-wrapper {
      width: 35px;
      height: 64px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .pen-wrapper svg {
      transition: transform 0.3s ease-in-out;
      transform: translateY(8px);
    }
    .edgeless-pen-button:hover .pen-wrapper svg,
    .pen-wrapper.active svg {
      transform: translateY(0);
    }
  `;

  private readonly _color$ = computed(() => {
    const theme = this.edgeless.std.get(ThemeProvider).theme$.value;
    const pen = this.pen$.value;
    return this.edgeless.std
      .get(ThemeProvider)
      .generateColorProperty(
        this.edgeless.std.get(EditPropsStore).lastProps$.value[pen].color,
        undefined,
        theme
      );
  });

  private readonly penIcon$ = computed(() => {
    const pen = this.pen$.value;
    const theme = this.edgeless.std.get(ThemeProvider).app$.value;
    return penMap[theme][pen];
  });

  private readonly pen$ =
    signal<Extract<GfxToolsFullOptionValue['type'], 'brush' | 'highlighter'>>(
      'brush'
    );

  override enableActiveBackground = true;

  override type: GfxToolsFullOptionValue['type'][] = ['brush', 'highlighter'];

  private _togglePenMenu() {
    if (this.tryDisposePopper()) return;
    !this.active && this.setEdgelessTool(this.pen$.peek());
    const menu = this.createPopper('edgeless-pen-menu', this);
    Object.assign(menu.element, {
      pen$: this.pen$,
      edgeless: this.edgeless,
      onChange: (props: Record<string, unknown>) => {
        const pen = this.pen$.peek();
        this.edgeless.std.get(EditPropsStore).recordLastProps(pen, props);
        this.setEdgelessTool(pen);
      },
    });
  }

  override render() {
    const {
      active,
      penIcon$: { value: icon },
      _color$: { value: color },
    } = this;

    return html`
      <edgeless-toolbar-button
        class="edgeless-pen-button"
        .tooltip=${this.popper
          ? ''
          : html`<affine-tooltip-content-with-shortcut
              data-tip="${'Pen'}"
              data-shortcut="${'P'}"
            ></affine-tooltip-content-with-shortcut>`}
        .tooltipOffset=${4}
        .active=${active}
        .withHover=${true}
        @click=${() => this._togglePenMenu()}
      >
        <div style=${styleMap({ color })} class="pen-wrapper">${icon}</div>
      </edgeless-toolbar-button>
    `;
  }
}

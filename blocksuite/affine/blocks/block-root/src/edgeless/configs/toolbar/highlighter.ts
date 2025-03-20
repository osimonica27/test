import { EdgelessCRUDIdentifier } from '@blocksuite/affine-block-surface';
import {
  adjustColorAlpha,
  packColor,
  type PickColorEvent,
} from '@blocksuite/affine-components/color-picker';
import {
  DefaultTheme,
  HIGHLIGHTER_LINE_WIDTHS,
  HighlighterElementModel,
  type LineWidth,
  resolveColor,
} from '@blocksuite/affine-model';
import { type ToolbarModuleConfig } from '@blocksuite/affine-shared/services';
import {
  getMostCommonResolvedValue,
  getMostCommonValue,
} from '@blocksuite/affine-shared/utils';
import { html } from 'lit';

export const builtinHighlighterToolbarConfig = {
  actions: [
    {
      id: 'a.line-width',
      content(ctx) {
        const models = ctx.getSurfaceModelsByType(HighlighterElementModel);
        if (!models.length) return null;

        const lineWidth = getMostCommonValue(models, 'lineWidth') ?? 10;
        const onPick = (e: CustomEvent<LineWidth>) => {
          e.stopPropagation();

          const lineWidth = e.detail;

          for (const model of models) {
            ctx.std
              .get(EdgelessCRUDIdentifier)
              .updateElement(model.id, { lineWidth });
          }
        };

        return html`
          <edgeless-line-width-panel
            .config=${{
              width: 140,
              itemSize: 16,
              itemIconSize: 8,
              dragHandleSize: 14,
              count: HIGHLIGHTER_LINE_WIDTHS.length,
            }}
            .lineWidths=${HIGHLIGHTER_LINE_WIDTHS}
            .selectedSize=${lineWidth}
            @select=${onPick}
          >
          </edgeless-line-width-panel>
        `;
      },
    },
    {
      id: 'b.color-picker',
      content(ctx) {
        const models = ctx.getSurfaceModelsByType(HighlighterElementModel);
        if (!models.length) return null;

        const theme = ctx.theme.edgeless$.value;

        const field = 'color';
        const firstModel = models[0];
        const originalColor = firstModel[field];
        const color =
          getMostCommonResolvedValue(models, field, color =>
            resolveColor(color, theme)
          ) ?? resolveColor(DefaultTheme.black, theme);
        const onPick = (e: PickColorEvent) => {
          if (e.type === 'pick') {
            const color = adjustColorAlpha(e.detail.value, 0.5);
            for (const model of models) {
              const props = packColor(field, color);
              ctx.std
                .get(EdgelessCRUDIdentifier)
                .updateElement(model.id, props);
            }
            return;
          }

          for (const model of models) {
            model[e.type === 'start' ? 'stash' : 'pop'](field);
          }
        };

        return html`
          <edgeless-color-picker-button
            class="color"
            .colorPanelClass="${'one-way small'}"
            .label="${'Color'}"
            .pick=${onPick}
            .color=${color}
            .theme=${theme}
            .originalColor=${originalColor}
            .palettes=${DefaultTheme.StrokeColorShortPalettes}
            .shouldKeepColor=${true}
            .enableCustomColor=${false}
          >
          </edgeless-color-picker-button>
        `;
      },
    },
  ],

  when: ctx => ctx.getSurfaceModelsByType(HighlighterElementModel).length > 0,
} as const satisfies ToolbarModuleConfig;

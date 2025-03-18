import { createLitPortal } from '@blocksuite/affine-components/portal';
import {
  AttachmentBlockModel,
  defaultAttachmentProps,
} from '@blocksuite/affine-model';
import {
  EMBED_CARD_HEIGHT,
  EMBED_CARD_WIDTH,
} from '@blocksuite/affine-shared/consts';
import {
  ActionPlacement,
  type ToolbarAction,
  type ToolbarActionGroup,
  type ToolbarModuleConfig,
} from '@blocksuite/affine-shared/services';
import { Bound } from '@blocksuite/global/gfx';
import {
  CaptionIcon,
  CopyIcon,
  DeleteIcon,
  DownloadIcon,
  DuplicateIcon,
  EditIcon,
  ResetIcon,
} from '@blocksuite/icons/lit';
import { flip, offset } from '@floating-ui/dom';
import { computed } from '@preact/signals-core';
import { html } from 'lit';
import { keyed } from 'lit/directives/keyed.js';

import { AttachmentBlockComponent } from '../attachment-block';
import { RenameModal } from '../components/rename-model';
import { AttachmentEmbedProvider } from '../embed';
import { cloneAttachmentProperties } from '../utils';

const trackBaseProps = {
  segment: 'doc',
  page: 'doc editor',
  module: 'toolbar',
  category: 'attachment',
  type: 'card view',
};

export const attachmentViewDropdownMenu = {
  id: 'b.conversions',
  actions: [
    {
      id: 'card',
      label: 'Card view',
      run(ctx) {
        const model = ctx.getCurrentModelByType(AttachmentBlockModel);
        if (!model) return;

        const style = defaultAttachmentProps.style!;
        const width = EMBED_CARD_WIDTH[style];
        const height = EMBED_CARD_HEIGHT[style];
        const bound = Bound.deserialize(model.xywh);
        bound.w = width;
        bound.h = height;

        ctx.store.updateBlock(model, {
          style,
          embed: false,
          xywh: bound.serialize(),
        });
      },
    },
    {
      id: 'embed',
      label: 'Embed view',
      run(ctx) {
        const model = ctx.getCurrentModelByType(AttachmentBlockModel);
        if (!model) return;

        // Clears
        ctx.reset();
        ctx.select('note');

        ctx.std.get(AttachmentEmbedProvider).convertTo(model);

        ctx.track('SelectedView', {
          ...trackBaseProps,
          control: 'select view',
          type: 'embed view',
        });
      },
    },
  ],
  content(ctx) {
    const model = ctx.getCurrentModelByType(AttachmentBlockModel);
    if (!model) return null;

    const embedProvider = ctx.std.get(AttachmentEmbedProvider);
    const actions = this.actions.map(action => ({ ...action }));
    const viewType$ = computed(() => {
      const [cardAction, embedAction] = actions;
      const embed = model.props.embed$.value ?? false;

      cardAction.disabled = !embed;
      embedAction.disabled = embed && embedProvider.embedded(model);

      return embed ? embedAction.label : cardAction.label;
    });
    const toggle = (e: CustomEvent<boolean>) => {
      const opened = e.detail;
      if (!opened) return;

      ctx.track('OpenedViewSelector', {
        ...trackBaseProps,
        control: 'switch view',
      });
    };

    return html`${keyed(
      model,
      html`<affine-view-dropdown-menu
        .actions=${actions}
        .context=${ctx}
        .toggle=${toggle}
        .viewType$=${viewType$}
      ></affine-view-dropdown-menu>`
    )}`;
  },
} satisfies ToolbarActionGroup<ToolbarAction>;

export const builtinToolbarConfig = {
  actions: [
    {
      id: 'a.rename',
      content(cx) {
        const block = cx.getCurrentBlockByType(AttachmentBlockComponent);
        if (!block) return null;

        const abortController = new AbortController();
        abortController.signal.onabort = () => cx.show();

        return html`
          <editor-icon-button
            aria-label="Rename"
            .tooltip="${'Rename'}"
            @click=${() => {
              cx.hide();

              createLitPortal({
                template: RenameModal({
                  model: block.model,
                  editorHost: cx.host,
                  abortController,
                }),
                computePosition: {
                  referenceElement: block,
                  placement: 'top-start',
                  middleware: [flip(), offset(4)],
                },
                abortController,
              });
            }}
          >
            ${EditIcon()}
          </editor-icon-button>
        `;
      },
    },
    attachmentViewDropdownMenu,
    {
      id: 'c.download',
      tooltip: 'Download',
      icon: DownloadIcon(),
      run(ctx) {
        const block = ctx.getCurrentBlockByType(AttachmentBlockComponent);
        block?.download();
      },
    },
    {
      id: 'd.caption',
      tooltip: 'Caption',
      icon: CaptionIcon(),
      run(ctx) {
        const block = ctx.getCurrentBlockByType(AttachmentBlockComponent);
        block?.captionEditor?.show();

        ctx.track('OpenedCaptionEditor', {
          ...trackBaseProps,
          control: 'add caption',
        });
      },
    },
    {
      placement: ActionPlacement.More,
      id: 'a.clipboard',
      actions: [
        {
          id: 'copy',
          label: 'Copy',
          icon: CopyIcon(),
          run(ctx) {
            // TODO(@fundon): unify `clone` method
            const block = ctx.getCurrentBlockByType(AttachmentBlockComponent);
            block?.copy();
          },
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          icon: DuplicateIcon(),
          run(ctx) {
            const model = ctx.getCurrentModelByType(AttachmentBlockModel);
            if (!model) return;

            // TODO(@fundon): unify `duplicate` method
            ctx.store.addSiblingBlocks(model, [
              {
                flavour: model.flavour,
                ...cloneAttachmentProperties(model),
              },
            ]);
          },
        },
      ],
    },
    {
      placement: ActionPlacement.More,
      id: 'b.refresh',
      label: 'Reload',
      icon: ResetIcon(),
      run(ctx) {
        const block = ctx.getCurrentBlockByType(AttachmentBlockComponent);
        block?.refreshData();
      },
    },
    {
      placement: ActionPlacement.More,
      id: 'c.delete',
      label: 'Delete',
      icon: DeleteIcon(),
      variant: 'destructive',
      run(ctx) {
        const model = ctx.getCurrentModel();
        if (!model) return;

        ctx.store.deleteBlock(model.id);

        // Clears
        ctx.select('note');
        ctx.reset();
      },
    },
  ],
} as const satisfies ToolbarModuleConfig;

import { toast } from '@blocksuite/affine-components/toast';
import type { ParagraphBlockModel } from '@blocksuite/affine-model';
import {
  getInlineEditorByModel,
  insertContent,
} from '@blocksuite/affine-rich-text';
import { REFERENCE_NODE } from '@blocksuite/affine-shared/consts';
import { createDefaultDoc } from '@blocksuite/affine-shared/utils';
import {
  ArrowDownBigIcon,
  ArrowUpBigIcon,
  CopyIcon,
  DeleteIcon,
  DualLinkIcon,
  LinkedPageIcon,
  NowIcon,
  PlusIcon,
  TodayIcon,
  TomorrowIcon,
  YesterdayIcon,
} from '@blocksuite/icons/lit';
import type { DeltaInsert } from '@blocksuite/inline';
import { Slice, Text } from '@blocksuite/store';

import { slashMenuToolTips } from './tooltips';
import type { SlashMenuConfig } from './types';
import { formatDate, formatTime } from './utils';

export const defaultSlashMenuConfig: SlashMenuConfig = {
  disableWhen: ({ model }) => {
    return model.flavour === 'affine:code';
  },
  items: () => {
    const now = new Date();
    const tomorrow = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return [
      {
        name: 'New Doc',
        description: 'Start a new document.',
        icon: PlusIcon(),
        tooltip: slashMenuToolTips['New Doc'],
        group: '3_Page@0',
        when: ({ model }) =>
          model.doc.schema.flavourSchemaMap.has('affine:embed-linked-doc'),
        action: ({ std, model }) => {
          const newDoc = createDefaultDoc(std.host.doc.workspace);
          insertContent(std.host, model, REFERENCE_NODE, {
            reference: {
              type: 'LinkedPage',
              pageId: newDoc.id,
            },
          });
        },
      },
      {
        name: 'Linked Doc',
        description: 'Link to another document.',
        icon: LinkedPageIcon(),
        tooltip: slashMenuToolTips['Linked Doc'],
        searchAlias: ['dual link'],
        group: '3_Page@1',
        when: ({ std, model }) => {
          const root = model.doc.root;
          if (!root) return false;
          const linkedDocWidget = std.view.getWidget(
            'affine-linked-doc-widget',
            root.id
          );
          if (!linkedDocWidget) return false;

          return model.doc.schema.flavourSchemaMap.has(
            'affine:embed-linked-doc'
          );
        },
        action: ({ model, std }) => {
          const root = model.doc.root;
          if (!root) return;
          const linkedDocWidget = std.view.getWidget(
            'affine-linked-doc-widget',
            root.id
          );
          if (!linkedDocWidget) return;
          // TODO(@L-Sun): make linked-doc-widget as extension
          // @ts-expect-error same as above
          const triggerKey = linkedDocWidget.config.triggerKeys[0];

          insertContent(std.host, model, triggerKey);

          const inlineEditor = getInlineEditorByModel(std.host, model);
          // Wait for range to be updated
          inlineEditor?.slots.inlineRangeSync.once(() => {
            // TODO(@L-Sun): make linked-doc-widget as extension
            // @ts-expect-error same as above
            linkedDocWidget.show({ addTriggerKey: true });
          });
        },
      },
      {
        name: 'Today',
        icon: TodayIcon(),
        tooltip: slashMenuToolTips['Today'],
        description: formatDate(now),
        group: '6_Date@0',
        action: ({ std, model }) => {
          insertContent(std.host, model, formatDate(now));
        },
      },
      {
        name: 'Tomorrow',
        icon: TomorrowIcon(),
        tooltip: slashMenuToolTips['Tomorrow'],
        description: formatDate(tomorrow),
        group: '6_Date@1',
        action: ({ std, model }) => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          insertContent(std.host, model, formatDate(tomorrow));
        },
      },
      {
        name: 'Yesterday',
        icon: YesterdayIcon(),
        tooltip: slashMenuToolTips['Yesterday'],
        description: formatDate(yesterday),
        group: '6_Date@2',
        action: ({ std, model }) => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          insertContent(std.host, model, formatDate(yesterday));
        },
      },
      {
        name: 'Now',
        icon: NowIcon(),
        tooltip: slashMenuToolTips['Now'],
        description: formatTime(now),
        group: '6_Date@3',
        action: ({ std, model }) => {
          insertContent(std.host, model, formatTime(now));
        },
      },
      {
        name: 'Move Up',
        description: 'Shift this line up.',
        icon: ArrowUpBigIcon(),
        tooltip: slashMenuToolTips['Move Up'],
        group: '8_Actions@0',
        action: ({ std, model }) => {
          const { host } = std;
          const previousSiblingModel = host.doc.getPrev(model);
          if (!previousSiblingModel) return;

          const parentModel = host.doc.getParent(previousSiblingModel);
          if (!parentModel) return;

          host.doc.moveBlocks([model], parentModel, previousSiblingModel, true);
        },
      },
      {
        name: 'Move Down',
        description: 'Shift this line down.',
        icon: ArrowDownBigIcon(),
        tooltip: slashMenuToolTips['Move Down'],
        group: '8_Actions@1',
        action: ({ std, model }) => {
          const { host } = std;
          const nextSiblingModel = host.doc.getNext(model);
          if (!nextSiblingModel) return;

          const parentModel = host.doc.getParent(nextSiblingModel);
          if (!parentModel) return;

          host.doc.moveBlocks([model], parentModel, nextSiblingModel, false);
        },
      },
      {
        name: 'Copy',
        description: 'Copy this line to clipboard.',
        icon: CopyIcon(),
        tooltip: slashMenuToolTips['Copy'],
        group: '8_Actions@2',
        action: ({ std, model }) => {
          const slice = Slice.fromModels(std.store, [model]);

          std.clipboard
            .copy(slice)
            .then(() => {
              toast(std.host, 'Copied to clipboard');
            })
            .catch(e => {
              console.error(e);
            });
        },
      },
      {
        name: 'Duplicate',
        description: 'Create a duplicate of this line.',
        icon: DualLinkIcon(),
        tooltip: slashMenuToolTips['Copy'],
        group: '8_Actions@3',
        action: ({ std, model }) => {
          if (!model.text || !(model.text instanceof Text)) {
            console.error("Can't duplicate a block without text");
            return;
          }
          const { host } = std;
          const parent = host.doc.getParent(model);
          if (!parent) {
            console.error(
              'Failed to duplicate block! Parent not found: ' +
                model.id +
                '|' +
                model.flavour
            );
            return;
          }
          const index = parent.children.indexOf(model);

          // TODO add clone model util
          host.doc.addBlock(
            model.flavour as never,
            {
              type: (model as ParagraphBlockModel).type,
              text: new Text(model.text.toDelta() as DeltaInsert[]),
              // @ts-expect-error FIXME: ts error
              checked: model.checked,
            },
            host.doc.getParent(model),
            index
          );
        },
      },
      {
        name: 'Delete',
        description: 'Remove this line permanently.',
        searchAlias: ['remove'],
        icon: DeleteIcon(),
        tooltip: slashMenuToolTips['Delete'],
        group: '8_Actions@4',
        action: ({ std, model }) => {
          std.host.doc.deleteBlock(model);
        },
      },
    ];
  },
};

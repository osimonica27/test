import { updateBlockType } from '@blocksuite/affine-block-note';
import {
  formatBlockCommand,
  type TextConversionConfig,
  type TextFormatConfig,
} from '@blocksuite/affine-rich-text';
import { isInsideBlockByFlavour } from '@blocksuite/affine-shared/utils';
import { BlockSelection } from '@blocksuite/block-std';
import type { BlockModel } from '@blocksuite/store';

import { slashMenuToolTips } from './tooltips/index.js';
import type {
  SlashMenuActionItem,
  SlashMenuConfig,
  SlashMenuContext,
  SlashMenuItem,
  SlashMenuSubMenu,
} from './types';

export function isActionItem(item: SlashMenuItem): item is SlashMenuActionItem {
  return 'action' in item;
}

export function isSubMenuItem(item: SlashMenuItem): item is SlashMenuSubMenu {
  return 'subMenu' in item;
}

export function slashItemClassName({ name }: SlashMenuItem) {
  return name.split(' ').join('-').toLocaleLowerCase();
}

export function parseGroup(group: NonNullable<SlashMenuItem['group']>) {
  return [
    parseInt(group.split('_')[0]),
    group.split('_')[1].split('@')[0],
    parseInt(group.split('@')[1]),
  ] as const;
}

function itemCompareFn(a: SlashMenuItem, b: SlashMenuItem) {
  if (a.group === undefined && b.group === undefined) return 0;
  if (a.group === undefined) return -1;
  if (b.group === undefined) return 1;

  const [aGroupIndex, aGroupName, aItemIndex] = parseGroup(a.group);
  const [bGroupIndex, bGroupName, bItemIndex] = parseGroup(b.group);
  if (isNaN(aGroupIndex)) return -1;
  if (isNaN(bGroupIndex)) return 1;
  if (aGroupIndex < bGroupIndex) return -1;
  if (aGroupIndex > bGroupIndex) return 1;

  if (aGroupName !== bGroupName) return aGroupName.localeCompare(bGroupName);

  if (isNaN(aItemIndex)) return -1;
  if (isNaN(bItemIndex)) return 1;

  return aItemIndex - bItemIndex;
}

export function buildSlashMenuItems(
  items: SlashMenuItem[],
  context: SlashMenuContext,
  transform?: (item: SlashMenuItem) => SlashMenuItem
): SlashMenuItem[] {
  if (transform) items = items.map(transform);

  const result = items
    .filter(item => (item.when ? item.when(context) : true))
    .sort(itemCompareFn)
    .map(item => {
      if (isSubMenuItem(item)) {
        return {
          ...item,
          subMenu: buildSlashMenuItems(item.subMenu, context),
        };
      } else {
        return { ...item };
      }
    });
  return result;
}

export function mergeSlashMenuConfigs(
  configs: Map<string, SlashMenuConfig>
): SlashMenuConfig {
  return {
    items: Array.from(configs.values().flatMap(config => config.items)),
    disableWhen: ctx =>
      configs
        .values()
        .map(config => config.disableWhen?.(ctx) ?? false)
        .some(Boolean),
  };
}

// TODO(@L-Sun): remove edgeless text check
export function insideEdgelessText(model: BlockModel) {
  return isInsideBlockByFlavour(model.doc, model, 'affine:edgeless-text');
}

export function tryRemoveEmptyLine(model: BlockModel) {
  if (model.text?.length === 0) {
    model.doc.deleteBlock(model);
  }
}

export function createConversionItem(
  config: TextConversionConfig,
  group?: SlashMenuItem['group']
): SlashMenuActionItem {
  const { name, description, icon, flavour, type } = config;
  return {
    name,
    group,
    description,
    icon,
    tooltip: slashMenuToolTips[name],
    when: ({ model }) => model.doc.schema.flavourSchemaMap.has(flavour),
    action: ({ std }) => {
      std.command.exec(updateBlockType, {
        flavour,
        props: { type },
      });
    },
  };
}

export function createTextFormatItem(
  config: TextFormatConfig,
  group?: SlashMenuItem['group']
): SlashMenuActionItem {
  const { name, icon, id, action } = config;
  return {
    name,
    icon,
    group,
    tooltip: slashMenuToolTips[name],
    action: ({ std, model }) => {
      const { host } = std;

      if (model.text?.length !== 0) {
        std.command.exec(formatBlockCommand, {
          blockSelections: [
            std.selection.create(BlockSelection, {
              blockId: model.id,
            }),
          ],
          styles: { [id]: true },
        });
      } else {
        // like format bar when the line is empty
        action(host);
      }
    },
  };
}

export function formatDate(date: Date) {
  // yyyy-mm-dd
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const strTime = `${year}-${month}-${day}`;
  return strTime;
}

export function formatTime(date: Date) {
  // mm-dd hh:mm
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const strTime = `${month}-${day} ${hours}:${minutes}`;
  return strTime;
}

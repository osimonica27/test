import zod from 'zod';

import { t } from '../../core/logical/type-presets.js';
import { propertyType } from '../../core/property/property-config.js';
export const progressPropertyType = propertyType('progress');

export const progressPropertyModelConfig = progressPropertyType.modelConfig({
  name: 'Progress',
  valueSchema: zod.number().optional(),
  type: () => t.number.instance(),
  defaultData: () => ({}),
  cellToString: ({ value }) => value?.toString() ?? '',
  cellFromString: ({ value }) => {
    const num = value ? Number(value) : NaN;
    return {
      value: isNaN(num) ? null : num,
    };
  },
  cellToJson: ({ value }) => value ?? null,
  cellFromJson: ({ value }) => {
    if (typeof value !== 'number') return undefined;
    return value;
  },
  isEmpty: () => false,
});

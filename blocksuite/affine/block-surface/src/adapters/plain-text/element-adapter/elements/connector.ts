import { getConnectorText } from '../../../utils/text.js';
import type { ElementModelToPlainTextAdapterMatcher } from '../type.js';

export const connectorToPlainTextAdapterMatcher: ElementModelToPlainTextAdapterMatcher =
  {
    name: 'connector',
    match: elementModel => elementModel.type === 'connector',
    toAST: elementModel => {
      const text = getConnectorText(elementModel);
      const content = `Connector, with text label "${text}"`;
      return { content };
    },
  };

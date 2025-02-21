import { describe, expect, it } from 'vitest';

import { PATH_FACTORIES } from '../routes';

describe('PATH_FACTORIES', () => {
  it('should generate correct paths', () => {
    expect(
      PATH_FACTORIES.workspace.doc({
        workspaceId: 'test-workspace',
        docId: 'test-doc',
      })
    ).toBe('/workspaces/test-workspace/docs/test-doc');
  });
});

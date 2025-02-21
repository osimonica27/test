# Routes

## Usage

### Path Factories

```ts
import { PATH_FACTORIES } from '@affine/routes';

const path = PATH_FACTORIES.workspace.doc({ workspaceId: '123', docId: '456' });
//                                        ^^^^ with typecheck
```

### Path Parameter

```ts
import { RouteParamsTypes } from '@affine/routes';

function Doc() {
  const { workspaceId, docId } = useParams<RouteParamsTypes['workspace']['doc']['root']>();
}

function Attachment() {
  const { workspaceId, docId, attachmentId } = useParams<RouteParamsTypes['workspace']['doc']['attachment']>();
}
```

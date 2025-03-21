import {
  type WorkspaceMetadata,
  WorkspacesService,
} from '@affine/core/modules/workspace';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect } from 'react';

export function useWorkspaceInfo(meta?: WorkspaceMetadata) {
  const workspacesService = useService(WorkspacesService);

  const profile = meta ? workspacesService.getProfile(meta) : undefined;

  useEffect(() => {
    profile?.revalidate();
  }, [meta, profile]);

  return useLiveData(profile?.profile$);
}

export function useWorkspaceName(meta?: WorkspaceMetadata) {
  const information = useWorkspaceInfo(meta);

  return information?.name;
}

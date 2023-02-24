import { useAtom } from 'jotai';
import { useRouter } from 'next/router';
import React, { useCallback } from 'react';

import {
  openCreateWorkspaceModalAtom,
  openWorkspacesModalAtom,
} from '../atoms';
import { CreateWorkspaceModal } from '../components/pure/create-workspace-modal';
import { WorkspaceListModal } from '../components/pure/workspace-list-modal';
import { useCurrentUser } from '../hooks/current/use-current-user';
import { useCurrentWorkspace } from '../hooks/current/use-current-workspace';
import { useWorkspaces, useWorkspacesHelper } from '../hooks/use-workspaces';
import { apis } from '../shared/apis';

export function Modals() {
  const [openWorkspacesModal, setOpenWorkspacesModal] = useAtom(
    openWorkspacesModalAtom
  );
  const [openCreateWorkspaceModal, setOpenCreateWorkspaceModal] = useAtom(
    openCreateWorkspaceModalAtom
  );
  const router = useRouter();
  const user = useCurrentUser();
  const workspaces = useWorkspaces();
  const [currentWorkspace, setCurrentWorkspace] = useCurrentWorkspace();
  const { createRemLocalWorkspace } = useWorkspacesHelper();
  return (
    <>
      <WorkspaceListModal
        user={user}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspace?.id ?? null}
        open={openWorkspacesModal}
        onClose={useCallback(() => {
          setOpenWorkspacesModal(false);
        }, [setOpenWorkspacesModal])}
        onClickWorkspace={useCallback(
          workspace => {
            setCurrentWorkspace(workspace.id);
            router.push({
              pathname: `/workspace/[workspaceId]/all`,
              query: {
                workspaceId: workspace.id,
              },
            });
            setOpenWorkspacesModal(false);
          },
          [router, setCurrentWorkspace, setOpenWorkspacesModal]
        )}
        onClickLogin={useCallback(() => {
          apis.signInWithGoogle().then(() => {
            router.reload();
          });
        }, [router])}
        onClickLogout={useCallback(() => {
          apis.auth.clear();
          router.reload();
        }, [router])}
        onCreateWorkspace={useCallback(() => {
          setOpenCreateWorkspaceModal(true);
        }, [setOpenCreateWorkspaceModal])}
      />
      <CreateWorkspaceModal
        open={openCreateWorkspaceModal}
        onClose={useCallback(() => {
          setOpenCreateWorkspaceModal(false);
        }, [setOpenCreateWorkspaceModal])}
        onCreate={useCallback(
          name => {
            const id = createRemLocalWorkspace(name);
            setOpenCreateWorkspaceModal(false);
            router.push({
              pathname: '/workspace/[workspaceId]/all',
              query: {
                workspaceId: id,
              },
            });
          },
          [createRemLocalWorkspace, router, setOpenCreateWorkspaceModal]
        )}
      />
    </>
  );
}

export const ModalProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return (
    <>
      <Modals />
      {children}
    </>
  );
};

import { WorkspaceFallback } from '@affine/component/workspace';
import { DebugLogger } from '@affine/debug';
import { WorkspaceSubPath } from '@affine/env/workspace';
import { rootWorkspacesMetadataAtom } from '@affine/workspace/atom';
import { getWorkspace } from '@affine/workspace/utils';
import { useAtomValue } from 'jotai';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Suspense, useEffect } from 'react';

import { RouteLogic, useRouterHelper } from '../hooks/use-router-helper';
import { useAppHelper } from '../hooks/use-workspaces';
import { AllWorkspaceModals } from '../providers/modal-provider';

const logger = new DebugLogger('index:router');

const IndexPageInner = () => {
  const router = useRouter();
  const { jumpToPage, jumpToSubPath } = useRouterHelper(router);
  const meta = useAtomValue(rootWorkspacesMetadataAtom);
  const helper = useAppHelper();

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    const lastId = localStorage.getItem('last_workspace_id');
    const lastPageId = localStorage.getItem('last_page_id');

    const target =
      (lastId && meta.find(({ id }) => id === lastId)) || meta.at(0);
    if (target) {
      const targetWorkspace = getWorkspace(target.id);
      const nonTrashPages = targetWorkspace.meta.pageMetas.filter(
        ({ trash }) => !trash
      );
      const pageId =
        nonTrashPages.find(({ id }) => id === lastPageId)?.id ??
        nonTrashPages.at(0)?.id;
      if (pageId) {
        logger.debug('Found target workspace. Jump to page', pageId);
        jumpToPage(targetWorkspace.id, pageId, RouteLogic.REPLACE).catch(
          err => {
            console.error(err);
          }
        );
      } else {
        const clearId = setTimeout(() => {
          dispose.dispose();
          logger.debug('Found target workspace. Jump to all pages');
          jumpToSubPath(
            targetWorkspace.id,
            WorkspaceSubPath.ALL,
            RouteLogic.REPLACE
          ).catch(err => {
            console.error(err);
          });
        }, 1000);
        const dispose = targetWorkspace.slots.pageAdded.once(pageId => {
          clearTimeout(clearId);
          jumpToPage(targetWorkspace.id, pageId, RouteLogic.REPLACE).catch(
            err => {
              console.error(err);
            }
          );
        });
        return () => {
          clearTimeout(clearId);
          dispose.dispose();
        };
      }
    } else {
      console.warn('No workspace found');
    }
    return;
  }, [meta, helper, jumpToPage, jumpToSubPath, router]);

  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <AllWorkspaceModals />
    </Suspense>
  );
};

const IndexPage: NextPage = () => {
  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <IndexPageInner />
    </Suspense>
  );
};

export default IndexPage;

import { AcceptInvitePage } from '@affine/component/member-components';
import {
  acceptInviteByInviteIdMutation,
  type GetInviteInfoQuery,
  getInviteInfoQuery,
} from '@affine/graphql';
import { fetcher, useMutation } from '@affine/workspace/affine/gql';
import { useAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { type LoaderFunction, redirect, useLoaderData } from 'react-router-dom';

import { authAtom } from '../atoms';
import { useCurrenLoginStatus } from '../hooks/affine/use-curren-login-status';
import { RouteLogic, useNavigateHelper } from '../hooks/use-navigate-helper';
import { useAppHelper } from '../hooks/use-workspaces';

export const loader: LoaderFunction = async args => {
  const inviteId = args.params.inviteId || '';
  const res = await fetcher({
    query: getInviteInfoQuery,
    variables: {
      inviteId,
    },
  }).catch(console.error);

  // If the inviteId is invalid, redirect to 404 page
  if (!res || !res?.getInviteInfo) {
    return redirect('/404');
  }

  return {
    inviteId,
    inviteInfo: res.getInviteInfo,
  };
};

export const Component = () => {
  const loginStatus = useCurrenLoginStatus();
  const { jumpToSignIn } = useNavigateHelper();
  const { addCloudWorkspace } = useAppHelper();

  const [, setAuthAtom] = useAtom(authAtom);
  const { inviteId, inviteInfo } = useLoaderData() as {
    inviteId: string;
    inviteInfo: GetInviteInfoQuery['getInviteInfo'];
  };

  const { trigger: acceptInviteByInviteId } = useMutation({
    mutation: acceptInviteByInviteIdMutation,
  });

  const loadWorkspaceAfterSignIn = useCallback(() => {
    addCloudWorkspace(inviteInfo.workspace.id);
  }, [addCloudWorkspace, inviteInfo.workspace.id]);

  // No mater sign in or not, we need to accept the invite
  useEffect(() => {
    acceptInviteByInviteId({
      workspaceId: inviteInfo.workspace.id,
      inviteId,
    }).catch(console.error);
  }, [inviteId, inviteInfo.workspace.id, acceptInviteByInviteId]);

  useEffect(() => {
    if (loginStatus === 'unauthenticated') {
      // We can not pass function to navigate state, so we need to save it in atom
      setAuthAtom(prev => ({
        ...prev,
        onceSignedIn: loadWorkspaceAfterSignIn,
      }));
      jumpToSignIn(RouteLogic.REPLACE, {
        state: {
          callbackURL: `/workspace/${inviteInfo.workspace.id}/all`,
        },
      });
    }
  }, [
    inviteInfo.workspace.id,
    jumpToSignIn,
    loadWorkspaceAfterSignIn,
    loginStatus,
    setAuthAtom,
  ]);

  if (loginStatus === 'authenticated') {
    return <InvitePage inviteInfo={inviteInfo} />;
  }

  return null;
};

export const InvitePage = ({
  inviteInfo,
}: {
  inviteInfo: GetInviteInfoQuery['getInviteInfo'];
}) => {
  const { jumpToWorkspace } = useNavigateHelper();

  const onOpenWorkspace = useCallback(() => {
    jumpToWorkspace(inviteInfo.workspace.id, RouteLogic.REPLACE);
  }, [inviteInfo.workspace.id, jumpToWorkspace]);

  return (
    <AcceptInvitePage
      onOpenWorkspace={onOpenWorkspace}
      inviteInfo={inviteInfo}
    />
  );
};

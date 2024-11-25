import { Button, Loading, notify } from '@affine/component';
import {
  InviteModal,
  type InviteModalProps,
  InviteTeamMemberModal,
  MemberLimitModal,
} from '@affine/component/member-components';
import { SettingRow } from '@affine/component/setting-components';
import { useInviteMember } from '@affine/core/components/hooks/affine/use-invite-member';
import { useRevokeMemberPermission } from '@affine/core/components/hooks/affine/use-revoke-member-permission';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { ServerService, SubscriptionService } from '@affine/core/modules/cloud';
import { WorkspacePermissionService } from '@affine/core/modules/permissions';
import { WorkspaceQuotaService } from '@affine/core/modules/quota';
import { copyTextToClipboard } from '@affine/core/utils/clipboard';
import { UserFriendlyError } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { useLiveData, useService, WorkspaceService } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SettingState } from '../../../types';
import { MemberList } from './member-list';
import * as styles from './styles.css';

//TODO(@JimmFly): implement team feature
const isTeam = true;

export const CloudWorkspaceMembersPanel = ({
  onChangeSettingState,
}: {
  onChangeSettingState: (settingState: SettingState) => void;
}) => {
  const serverService = useService(ServerService);
  const hasPaymentFeature = useLiveData(
    serverService.server.features$.map(f => f?.payment)
  );
  const workspace = useService(WorkspaceService).workspace;

  const permissionService = useService(WorkspacePermissionService);
  const isOwner = useLiveData(permissionService.permission.isOwner$);
  useEffect(() => {
    permissionService.permission.revalidate();
  }, [permissionService]);

  const workspaceQuotaService = useService(WorkspaceQuotaService);
  useEffect(() => {
    workspaceQuotaService.quota.revalidate();
  }, [workspaceQuotaService]);
  const isLoading = useLiveData(workspaceQuotaService.quota.isLoading$);
  const error = useLiveData(workspaceQuotaService.quota.error$);
  const workspaceQuota = useLiveData(workspaceQuotaService.quota.quota$);
  const subscriptionService = useService(SubscriptionService);
  const plan = useLiveData(
    subscriptionService.subscription.pro$.map(s => s?.plan)
  );
  const isLimited =
    workspaceQuota && workspaceQuota.memberLimit
      ? workspaceQuota.memberCount >= workspaceQuota.memberLimit
      : null;

  const t = useI18n();
  const { invite, isMutating } = useInviteMember(workspace.id);
  const revokeMemberPermission = useRevokeMemberPermission(workspace.id);

  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  const onInviteConfirm = useCallback<InviteModalProps['onConfirm']>(
    async ({ email, permission }) => {
      const success = await invite(
        email,
        permission,
        // send invite email
        true
      );
      if (success) {
        notify.success({
          title: t['Invitation sent'](),
          message: t['Invitation sent hint'](),
        });
        setOpen(false);
      }
    },
    [invite, t]
  );

  const handleUpgradeConfirm = useCallback(() => {
    onChangeSettingState({
      activeTab: 'plans',
      scrollAnchor: 'cloudPricingPlan',
    });
    track.$.settingsPanel.workspace.viewPlans({
      control: 'inviteMember',
    });
  }, [onChangeSettingState]);

  const onRevoke = useAsyncCallback(
    async (memberId: string) => {
      const res = await revokeMemberPermission(memberId);
      if (res?.revoke) {
        notify.success({ title: t['Removed successfully']() });
      }
    },
    [revokeMemberPermission, t]
  );

  const desc = useMemo(() => {
    if (!workspaceQuota) return null;

    if (isTeam) {
      return <span>{t['com.affine.payment.member.team.description']()}</span>;
    }
    return (
      <span>
        {t['com.affine.payment.member.description2']()}
        {hasPaymentFeature ? (
          <div
            className={styles.goUpgradeWrapper}
            onClick={handleUpgradeConfirm}
          >
            <span className={styles.goUpgrade}>
              {t['com.affine.payment.member.description.choose-plan']()}
            </span>
          </div>
        ) : null}
      </span>
    );
  }, [handleUpgradeConfirm, hasPaymentFeature, t, workspaceQuota]);

  const title = useMemo(() => {
    if (isTeam) {
      return `${t['Members']()} (${workspaceQuota?.memberCount})`;
    }
    return `${t['Members']()} (${workspaceQuota?.memberCount}/${workspaceQuota?.memberLimit})`;
  }, [t, workspaceQuota?.memberCount, workspaceQuota?.memberLimit]);

  if (workspaceQuota === null) {
    if (isLoading) {
      return <MembersPanelFallback />;
    } else {
      return (
        <span className={styles.errorStyle}>
          {error
            ? UserFriendlyError.fromAnyError(error).message
            : 'Failed to load members'}
        </span>
      );
    }
  }

  return (
    <>
      <SettingRow name={title} desc={desc} spreadCol={!!isOwner}>
        {isOwner ? (
          <>
            <Button onClick={openModal}>{t['Invite Members']()}</Button>
            {isTeam ? (
              <InviteTeamMemberModal
                open={open}
                setOpen={setOpen}
                onConfirm={onInviteConfirm}
                isMutating={isMutating}
                copyTextToClipboard={copyTextToClipboard}
              />
            ) : isLimited ? (
              <MemberLimitModal
                isFreePlan={!plan}
                open={open}
                plan={workspaceQuota.humanReadable.name ?? ''}
                quota={workspaceQuota.humanReadable.memberLimit ?? ''}
                setOpen={setOpen}
                onConfirm={handleUpgradeConfirm}
              />
            ) : (
              <InviteModal
                open={open}
                setOpen={setOpen}
                onConfirm={onInviteConfirm}
                isMutating={isMutating}
              />
            )}
          </>
        ) : null}
      </SettingRow>

      <div className={styles.membersPanel}>
        <MemberList isOwner={!!isOwner} onRevoke={onRevoke} />
      </div>
    </>
  );
};

export const MembersPanelFallback = () => {
  const t = useI18n();

  return (
    <>
      <SettingRow
        name={t['Members']()}
        desc={t['com.affine.payment.member.description2']()}
      />
      <div className={styles.membersPanel}>
        <MemberListFallback memberCount={1} />
      </div>
    </>
  );
};

const MemberListFallback = ({ memberCount }: { memberCount?: number }) => {
  // prevent page jitter
  const height = useMemo(() => {
    if (memberCount) {
      // height and margin-bottom
      return memberCount * 58 + (memberCount - 1) * 6;
    }
    return 'auto';
  }, [memberCount]);
  const t = useI18n();

  return (
    <div
      style={{
        height,
      }}
      className={styles.membersFallback}
    >
      <Loading size={20} />
      <span>{t['com.affine.settings.member.loading']()}</span>
    </div>
  );
};

import { Avatar, IconButton, Loading, Menu } from '@affine/component';
import { Pagination } from '@affine/component/member-components';
import { type AuthAccountInfo, AuthService } from '@affine/core/modules/cloud';
import {
  type Member,
  WorkspaceMembersService,
} from '@affine/core/modules/permissions';
import { Permission, UserFriendlyError } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { MoreVerticalIcon } from '@blocksuite/icons/rc';
import {
  useEnsureLiveData,
  useLiveData,
  useService,
  WorkspaceService,
} from '@toeverything/infra';
import clsx from 'clsx';
import { clamp } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ConfirmAssignModal } from './confirm-assign-modal';
import { MemberOptions } from './member-option';
import * as styles from './styles.css';

export const MemberList = ({
  isOwner,
  onRevoke,
}: {
  isOwner: boolean;
  onRevoke: (memberId: string) => void;
}) => {
  const membersService = useService(WorkspaceMembersService);
  const memberCount = useLiveData(membersService.members.memberCount$);
  const pageNum = useLiveData(membersService.members.pageNum$);
  const isLoading = useLiveData(membersService.members.isLoading$);
  const error = useLiveData(membersService.members.error$);
  const pageMembers = useLiveData(membersService.members.pageMembers$);

  useEffect(() => {
    membersService.members.revalidate();
  }, [membersService]);

  const session = useService(AuthService).session;
  const account = useEnsureLiveData(session.account$);

  const handlePageChange = useCallback(
    (_: number, pageNum: number) => {
      membersService.members.setPageNum(pageNum);
      membersService.members.revalidate();
    },
    [membersService]
  );

  return (
    <div>
      {pageMembers === undefined ? (
        isLoading ? (
          <MemberListFallback
            memberCount={
              memberCount
                ? clamp(
                    memberCount - pageNum * membersService.members.PAGE_SIZE,
                    1,
                    membersService.members.PAGE_SIZE
                  )
                : 1
            }
          />
        ) : (
          <span className={styles.errorStyle}>
            {error
              ? UserFriendlyError.fromAnyError(error).message
              : 'Failed to load members'}
          </span>
        )
      ) : (
        pageMembers?.map(member => (
          <MemberItem
            currentAccount={account}
            key={member.id}
            member={member}
            isOwner={isOwner}
            onRevoke={onRevoke}
          />
        ))
      )}
      {memberCount !== undefined &&
        memberCount > membersService.members.PAGE_SIZE && (
          <Pagination
            totalCount={memberCount}
            countPerPage={membersService.members.PAGE_SIZE}
            pageNum={pageNum}
            onPageChange={handlePageChange}
          />
        )}
    </div>
  );
};

const MemberItem = ({
  member,
  isOwner,
  currentAccount,
  onRevoke,
}: {
  member: Member;
  isOwner: boolean;
  currentAccount: AuthAccountInfo;
  onRevoke: (memberId: string) => void;
}) => {
  const t = useI18n();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const workspace = useService(WorkspaceService).workspace;
  const workspaceName = useLiveData(workspace.name$);
  const isEquals = workspaceName === inputValue;

  const show = isOwner && currentAccount.id !== member.id;

  //TODO(@JimmFly): implement team feature
  const underReview = member.accepted === false;

  const handleOpenAssignModal = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <div
      key={member.id}
      className={styles.memberListItem}
      data-testid="member-item"
    >
      <Avatar
        size={36}
        url={member.avatarUrl}
        name={(member.name ? member.name : member.email) as string}
      />
      <div className={styles.memberContainer}>
        {member.name ? (
          <>
            <div className={styles.memberName}>{member.name}</div>
            <div className={styles.memberEmail}>{member.email}</div>
          </>
        ) : (
          <div className={styles.memberName}>{member.email}</div>
        )}
      </div>
      <div
        className={clsx(styles.roleOrStatus, {
          pending: !member.accepted,
        })}
      >
        {member.accepted
          ? member.permission === Permission.Owner
            ? t.t('Workspace Owner')
            : member.permission === Permission.Admin
              ? t.t('Admin')
              : t.t('Collaborator')
          : underReview
            ? t.t('Under-Review')
            : t.t('Pending')}
      </div>
      <Menu
        items={
          <MemberOptions
            member={member}
            onRevoke={onRevoke}
            openAssignModal={handleOpenAssignModal}
          />
        }
      >
        <IconButton
          disabled={!show}
          style={{
            visibility: show ? 'visible' : 'hidden',
            flexShrink: 0,
          }}
        >
          <MoreVerticalIcon />
        </IconButton>
      </Menu>
      <ConfirmAssignModal
        open={open}
        setOpen={setOpen}
        member={member}
        inputValue={inputValue}
        setInputValue={setInputValue}
        isEquals={isEquals}
      />
    </div>
  );
};

export const MemberListFallback = ({
  memberCount,
}: {
  memberCount?: number;
}) => {
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

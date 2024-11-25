import { MenuItem, notify } from '@affine/component';
import type { Member } from '@affine/core/modules/permissions';
import { useI18n } from '@affine/i18n';
import { useCallback, useMemo } from 'react';

export const MemberOptions = ({
  member,
  onRevoke,
  openAssignModal,
}: {
  member: Member;
  onRevoke: (memberId: string) => void;
  openAssignModal: () => void;
}) => {
  const t = useI18n();

  const handleAssignOwner = useCallback(() => {
    openAssignModal();
  }, [openAssignModal]);

  const handleRevoke = useCallback(() => {
    onRevoke(member.id);
    notify.success({
      title: t['com.affine.payment.member.team.revoke.notify.title'](),
      message: t['com.affine.payment.member.team.revoke.notify.message']({
        name: member.name || member.email || member.id,
      }),
    });
  }, [onRevoke, member, t]);
  const handleApprove = useCallback(() => {
    notify.success({
      title: t['com.affine.payment.member.team.approve.notify.title'](),
      message: t['com.affine.payment.member.team.approve.notify.message']({
        name: member.name || member.email || member.id,
      }),
    });
  }, [member, t]);
  const handleDecline = useCallback(() => {
    notify.success({
      title: t['com.affine.payment.member.team.decline.notify.title'](),
      message: t['com.affine.payment.member.team.decline.notify.message']({
        name: member.name || member.email || member.id,
      }),
    });
  }, [member.email, member.id, member.name, t]);
  const handleRemove = useCallback(() => {
    onRevoke(member.id);
    notify.success({
      title: t['com.affine.payment.member.team.remove.notify.title'](),
      message: t['com.affine.payment.member.team.remove.notify.message']({
        name: member.name || member.email || member.id,
      }),
    });
  }, [member, onRevoke, t]);
  const handleChangeToAdmin = useCallback(() => {
    notify.success({
      title: t['com.affine.payment.member.team.change.notify.title'](),
      message: t['com.affine.payment.member.team.change.admin.notify.message']({
        name: member.name || member.email || member.id,
      }),
    });
  }, [member, t]);
  const handleChangeToCollaborator = useCallback(() => {
    notify.success({
      title: t['com.affine.payment.member.team.change.notify.title'](),
      message: t[
        'com.affine.payment.member.team.change.collaborator.notify.message'
      ]({
        name: member.name || member.email || member.id,
      }),
    });
  }, [member, t]);

  const operationButtonInfo = useMemo(() => {
    return [
      {
        label: t['com.affine.payment.member.team.approve'](),
        onClick: handleApprove,
        show: true,
      },
      {
        label: t['com.affine.payment.member.team.decline'](),
        onClick: handleDecline,
        show: true,
      },
      {
        label: t['com.affine.payment.member.team.revoke'](),
        onClick: handleRevoke,
        show: true,
      },
      {
        label: t['com.affine.payment.member.team.remove'](),
        onClick: handleRemove,
        show: true,
      },
      {
        label: t['com.affine.payment.member.team.change.collaborator'](),
        onClick: handleChangeToCollaborator,
        show: true,
      },
      {
        label: t['com.affine.payment.member.team.change.admin'](),
        onClick: handleChangeToAdmin,
        show: true,
      },
      {
        label: t['com.affine.payment.member.team.assign'](),
        onClick: handleAssignOwner,
        show: true,
      },
    ];
  }, [
    handleApprove,
    handleAssignOwner,
    handleChangeToAdmin,
    handleChangeToCollaborator,
    handleDecline,
    handleRemove,
    handleRevoke,
    t,
  ]);

  return (
    <>
      {operationButtonInfo.map(item =>
        item.show ? (
          <MenuItem key={item.label} onSelect={item.onClick}>
            {item.label}
          </MenuItem>
        ) : null
      )}
    </>
  );
};

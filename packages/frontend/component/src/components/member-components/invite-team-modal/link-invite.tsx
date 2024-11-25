import { useI18n } from '@affine/i18n';
import { CloseIcon } from '@blocksuite/icons/rc';
import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { useCallback, useMemo, useState } from 'react';

import { Button, IconButton } from '../../../ui/button';
import Input from '../../../ui/input';
import { Menu, MenuItem, MenuTrigger } from '../../../ui/menu';
import { notify } from '../../../ui/notification';
import * as styles from './styles.css';

const getMenuItems = (t: ReturnType<typeof useI18n>) => [
  {
    label: t['com.affine.payment.member.team.invite.expiration-date']({
      number: '1',
    }),
    value: 1,
  },
  {
    label: t['com.affine.payment.member.team.invite.expiration-date']({
      number: '3',
    }),
    value: 3,
  },
  {
    label: t['com.affine.payment.member.team.invite.expiration-date']({
      number: '7',
    }),
    value: 7,
  },
  {
    label: t['com.affine.payment.member.team.invite.expiration-date']({
      number: '30',
    }),
    value: 30,
  },
];

export const LinkInvite = ({
  copyTextToClipboard,
}: {
  copyTextToClipboard: (text: string) => Promise<boolean>;
}) => {
  const t = useI18n();
  const [selectedValue, setSelectedValue] = useState(7);
  const [invitationLink, setInvitationLink] = useState('');
  const menuItems = getMenuItems(t);
  const items = useMemo(() => {
    return menuItems.map(item => (
      <MenuItem key={item.value} onSelect={() => setSelectedValue(item.value)}>
        {item.label}
      </MenuItem>
    ));
  }, [menuItems]);

  const currentSelectedLabel = useMemo(
    () => menuItems.find(item => item.value === selectedValue)?.label,
    [menuItems, selectedValue]
  );

  //TODO(@JimmFly): implement team feature
  const onGenerate = useCallback(() => {
    setInvitationLink('ggsimida');
  }, []);

  const onCopy = useCallback(() => {
    copyTextToClipboard(invitationLink)
      .then(() =>
        notify.success({
          title: t['Copied link to clipboard'](),
        })
      )
      .catch(err => {
        console.error('Failed to copy text: ', err);
        notify.error({
          title: 'Failed to copy link to clipboard',
          message: err.message,
        });
      });
  }, [copyTextToClipboard, invitationLink, t]);

  const onReset = useCallback(() => {
    setInvitationLink('');
  }, []);

  return (
    <>
      <div className={styles.modalSubTitle}>
        {t['com.affine.payment.member.team.invite.link-expiration']()}
      </div>
      <Menu
        items={items}
        contentOptions={{
          style: {
            width: 'var(--radix-dropdown-menu-trigger-width)',
          },
        }}
      >
        <MenuTrigger style={{ width: '100%' }}>
          {currentSelectedLabel}
        </MenuTrigger>
      </Menu>
      <div className={styles.modalSubTitle}>
        {t['com.affine.payment.member.team.invite.invitation-link']()}
      </div>
      <div className={styles.invitationLinkContent}>
        <Input
          value={
            invitationLink
              ? invitationLink
              : 'https://your-app.com/invite/xxxxxxxx'
          }
          inputMode="none"
          disabled
          inputStyle={{
            fontSize: cssVar('fontXs'),
            color: cssVarV2(
              invitationLink ? 'text/primary' : 'text/placeholder'
            ),
            backgroundColor: cssVarV2('layer/background/primary'),
          }}
        />
        {invitationLink ? (
          <>
            <Button onClick={onCopy}>
              {t['com.affine.payment.member.team.invite.copy']()}
            </Button>
            <IconButton icon={<CloseIcon />} onClick={onReset} />
          </>
        ) : (
          <Button onClick={onGenerate}>
            {t['com.affine.payment.member.team.invite.generate']()}
          </Button>
        )}
      </div>
    </>
  );
};

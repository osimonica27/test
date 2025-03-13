import { buttonVariants } from '@affine/admin/components/ui/button';
import { cn } from '@affine/admin/utils';
import { AccountIcon, AiOutlineIcon, SelfhostIcon } from '@blocksuite/icons/rc';
import { cssVarV2 } from '@toeverything/theme/v2';
import { NavLink } from 'react-router-dom';

import { SettingsItem } from './settings-item';
import { UserDropdown } from './user-dropdown';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  isActive?: boolean;
  isCollapsed?: boolean;
}

const NavItem = ({ icon, label, to, isCollapsed }: NavItemProps) => {
  if (isCollapsed) {
    return (
      <NavLink
        to={to}
        className={cn(
          buttonVariants({
            variant: 'ghost',
            className: 'w-10 h-10',
            size: 'icon',
          })
        )}
        style={({ isActive }) => ({
          backgroundColor: isActive
            ? cssVarV2('selfhost/button/sidebarButton/bg/select')
            : undefined,
          '&:hover': {
            backgroundColor: cssVarV2('selfhost/button/sidebarButton/bg/hover'),
          },
        })}
      >
        {icon}
      </NavLink>
    );
  }

  return (
    <NavLink
      to={to}
      className={cn(
        buttonVariants({
          variant: 'ghost',
        }),
        'justify-start flex-none text-sm font-medium px-2'
      )}
      style={({ isActive }) => ({
        backgroundColor: isActive
          ? cssVarV2('selfhost/button/sidebarButton/bg/select')
          : undefined,
        '&:hover': {
          backgroundColor: cssVarV2('selfhost/button/sidebarButton/bg/hover'),
        },
      })}
    >
      {icon}
      {label}
    </NavLink>
  );
};

interface NavProps {
  isCollapsed?: boolean;
}

export function Nav({ isCollapsed = false }: NavProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 py-2 justify-between flex-grow h-full overflow-hidden',
        isCollapsed && 'overflow-visible'
      )}
    >
      <nav
        className={cn(
          'flex flex-1 flex-col gap-1 px-2 flex-grow overflow-hidden',
          isCollapsed && 'items-center px-0 gap-1 overflow-visible'
        )}
      >
        <NavItem
          to="/admin/config"
          icon={
            <SelfhostIcon className={cn(!isCollapsed && 'mr-2', 'h-5 w-5')} />
          }
          label="Server"
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/admin/accounts"
          icon={
            <AccountIcon className={cn(!isCollapsed && 'mr-2', 'h-5 w-5')} />
          }
          label="Accounts"
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/admin/ai"
          icon={
            <AiOutlineIcon className={cn(!isCollapsed && 'mr-2', 'h-5 w-5')} />
          }
          label="AI"
          isCollapsed={isCollapsed}
        />

        <SettingsItem isCollapsed={isCollapsed} />
      </nav>
      <div
        className={cn(
          'flex gap-1 px-2 flex-col overflow-hidden',
          isCollapsed && 'items-center px-0 gap-1'
        )}
      >
        <UserDropdown isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}

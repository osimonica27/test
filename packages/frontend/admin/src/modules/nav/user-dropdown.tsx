import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@affine/admin/components/ui/avatar';
import { Button } from '@affine/admin/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@affine/admin/components/ui/dropdown-menu';
import { CircleUser, MoreVertical } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { useCurrentUser, useRevalidateCurrentUser } from '../common';

interface UserDropdownProps {
  isCollapsed: boolean;
}

export function UserDropdown({ isCollapsed }: UserDropdownProps) {
  const currentUser = useCurrentUser();
  const relative = useRevalidateCurrentUser();

  const handleLogout = useCallback(() => {
    fetch('/api/auth/sign-out')
      .then(() => {
        toast.success('Logged out successfully');
        return relative();
      })
      .catch(err => {
        toast.error(`Failed to logout: ${err.message}`);
      });
  }, [relative]);

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-10 h-10" size="icon">
            <Avatar className="w-5 h-5">
              <AvatarImage src={currentUser?.avatarUrl ?? undefined} />
              <AvatarFallback>
                <CircleUser size={24} />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right">
          <DropdownMenuLabel>{currentUser?.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div
      className={`flex flex-none items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-1 py-3 flex-nowrap`}
    >
      <div className="flex items-center gap-2 font-medium text-ellipsis break-words overflow-hidden">
        <Avatar className="w-5 h-5">
          <AvatarImage src={currentUser?.avatarUrl ?? undefined} />
          <AvatarFallback>
            <CircleUser size={24} />
          </AvatarFallback>
        </Avatar>
        {currentUser?.name ? (
          <span className="text-sm text-nowrap text-ellipsis break-words overflow-hidden">
            {currentUser?.name}
          </span>
        ) : (
          // Fallback to email prefix if name is not available
          <span className="text-sm">{currentUser?.email.split('@')[0]}</span>
        )}
        <span
          className="rounded p-1 text-xs"
          style={{
            backgroundColor: 'rgba(30, 150, 235, 0.20)',
            color: 'rgba(30, 150, 235, 1)',
          }}
        >
          Admin
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="ml-2 p-1 h-6">
            <MoreVertical size={20} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right">
          <DropdownMenuLabel>{currentUser?.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

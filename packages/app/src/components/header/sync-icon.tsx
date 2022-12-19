import { CloudUnsyncedIcon, CloudInsyncIcon } from '@blocksuite/icons';
import { useModal } from '@/providers/global-modal-provider';
import { useAppState } from '@/providers/app-state-provider';
import { IconButton } from '@/ui/button';

export const SyncIcon = () => {
  const { triggerLoginModal } = useModal();
  const appState = useAppState();

  return appState.user ? (
    <IconButton iconSize="middle" disabled>
      <CloudInsyncIcon />
    </IconButton>
  ) : (
    <IconButton iconSize="middle" onClick={triggerLoginModal}>
      <CloudUnsyncedIcon />
    </IconButton>
  );
};

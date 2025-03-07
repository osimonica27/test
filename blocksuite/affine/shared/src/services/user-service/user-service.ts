import { createIdentifier } from '@blocksuite/global/di';
import type { ExtensionType } from '@blocksuite/store';
import type { Signal } from '@preact/signals-core';

import type { AffineUserInfo } from './types';

export interface UserService {
  getCurrentUser(): AffineUserInfo | null;
  userInfo$(id: string): Signal<AffineUserInfo | null>;
  revalidateUserInfo(id: string): void;
}

export const UserProvider = createIdentifier<UserService>(
  'affine-user-service'
);

export function UserServiceExtension(service: UserService): ExtensionType {
  return {
    setup(di) {
      di.addImpl(UserProvider, () => service);
    },
  };
}

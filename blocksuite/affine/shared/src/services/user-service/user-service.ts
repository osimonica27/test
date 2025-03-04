import { createIdentifier } from '@blocksuite/global/di';
import type { ExtensionType } from '@blocksuite/store';
import type { Signal } from '@preact/signals-core';

import type { AffineUserInfo } from './types';

export interface UserService {
  getCurrentUser(): AffineUserInfo;
  getUserInfo(id: string): Signal<AffineUserInfo | null>;
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

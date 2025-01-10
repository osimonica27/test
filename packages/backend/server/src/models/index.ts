import { Global, Injectable, Module } from '@nestjs/common';

import { SessionModel } from './session';
import { UserModel } from './user';
import { UserSessionModel } from './user-session';
import { VerificationTokenModel } from './verification-token';

const models = [
  UserModel,
  SessionModel,
  UserSessionModel,
  VerificationTokenModel,
] as const;

@Injectable()
export class Models {
  constructor(
    public readonly user: UserModel,
    public readonly session: SessionModel,
    public readonly userSession: UserSessionModel,
    public readonly verificationToken: VerificationTokenModel
  ) {}
}

@Global()
@Module({
  providers: [...models, Models],
  exports: [Models],
})
export class ModelModules {}

import { Global, Injectable, Module } from '@nestjs/common';

import { SessionModel } from './session';
import { UserModel } from './user';
import { VerificationTokenModel } from './verification-token';
import { WorkspaceModel } from './workspace';
import { WorkspacePageModel } from './workspace-page';

export * from './session';
export * from './user';
export * from './verification-token';
export * from './workspace';
export * from './workspace-page';

const models = [
  UserModel,
  SessionModel,
  VerificationTokenModel,
  WorkspaceModel,
  WorkspacePageModel,
] as const;

@Injectable()
export class Models {
  constructor(
    public readonly user: UserModel,
    public readonly session: SessionModel,
    public readonly verificationToken: VerificationTokenModel,
    public readonly workspace: WorkspaceModel,
    public readonly workspacePage: WorkspacePageModel
  ) {}
}

@Global()
@Module({
  providers: [...models, Models],
  exports: [Models],
})
export class ModelModules {}

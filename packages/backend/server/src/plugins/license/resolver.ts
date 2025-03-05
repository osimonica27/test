import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import { ActionForbidden, Config } from '../../base';
import { CurrentUser } from '../../core/auth';
import { AccessController } from '../../core/permission';
import { WorkspaceType } from '../../core/workspaces';
import { SubscriptionRecurring } from '../payment/types';
import { LicenseService } from './service';

@ObjectType()
export class License {
  @Field(() => Int)
  quantity!: number;

  @Field(() => SubscriptionRecurring)
  recurring!: string;

  @Field(() => Date)
  installedAt!: Date;

  @Field(() => Date)
  validatedAt!: Date;

  @Field(() => Date, { nullable: true })
  expiredAt!: Date | null;
}

@Resolver(() => WorkspaceType)
export class LicenseResolver {
  constructor(
    private readonly config: Config,
    private readonly service: LicenseService,
    private readonly ac: AccessController
  ) {}

  @ResolveField(() => License, {
    complexity: 2,
    description: 'The selfhost license of the workspace',
    nullable: true,
  })
  async license(
    @CurrentUser() user: CurrentUser,
    @Parent() workspace: WorkspaceType
  ): Promise<License | null> {
    // NOTE(@forehalo):
    //   we can't simply disable license resolver for non-selfhosted server
    //   it will make the gql codegen messed up.
    if (!this.config.isSelfhosted) {
      return null;
    }

    await this.ac
      .user(user.id)
      .workspace(workspace.id)
      .assert('Workspace.Payment.Manage');
    return this.service.getLicense(workspace.id);
  }

  @Mutation(() => License)
  async activateLicense(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('license') license: string
  ) {
    if (!this.config.isSelfhosted) {
      throw new ActionForbidden();
    }

    await this.ac
      .user(user.id)
      .workspace(workspaceId)
      .assert('Workspace.Payment.Manage');

    return this.service.activateTeamLicense(workspaceId, license);
  }

  @Mutation(() => Boolean)
  async deactivateLicense(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string
  ) {
    if (!this.config.isSelfhosted) {
      throw new ActionForbidden();
    }

    await this.ac
      .user(user.id)
      .workspace(workspaceId)
      .assert('Workspace.Payment.Manage');

    return this.service.deactivateTeamLicense(workspaceId);
  }

  @Mutation(() => String)
  async createSelfhostWorkspaceCustomerPortal(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string
  ) {
    if (!this.config.isSelfhosted) {
      throw new ActionForbidden();
    }

    await this.ac
      .user(user.id)
      .workspace(workspaceId)
      .assert('Workspace.Payment.Manage');

    const { url } = await this.service.createCustomerPortal(workspaceId);

    return url;
  }
}

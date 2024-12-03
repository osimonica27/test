import { Logger } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import {
  NotInSpace,
  RequestMutex,
  TooManyRequest,
  UserNotFound,
} from '../../../fundamentals';
import { CurrentUser } from '../../auth';
import { FeatureManagementService, FeatureType } from '../../features';
import { Permission, PermissionService } from '../../permission';
import {
  TeamWorkspaceConfigType,
  UpdateTeamWorkspaceConfigInput,
  WorkspaceType,
} from '../types';

/**
 * Workspace team resolver
 * Public apis rate limit: 10 req/m
 * Other rate limit: 120 req/m
 */
@Resolver(() => WorkspaceType)
export class TeamWorkspaceResolver {
  private readonly logger = new Logger(TeamWorkspaceResolver.name);

  constructor(
    private readonly permissions: PermissionService,
    private readonly feature: FeatureManagementService,
    private readonly mutex: RequestMutex
  ) {}

  @ResolveField(() => TeamWorkspaceConfigType, {
    description: 'Team workspace config',
    complexity: 2,
  })
  async teamConfig(@Parent() workspace: WorkspaceType) {
    return this.feature.getWorkspaceConfig(
      workspace.id,
      FeatureType.TeamWorkspace
    );
  }

  @Mutation(() => Boolean)
  async updateWorkspaceTeamConfig(
    @CurrentUser() user: CurrentUser,
    @Args({ name: 'input', type: () => UpdateTeamWorkspaceConfigInput })
    { id, ...configs }: UpdateTeamWorkspaceConfigInput
  ) {
    await this.permissions.checkWorkspace(id, user.id, Permission.Owner);

    return this.feature.updateWorkspaceConfig(
      id,
      FeatureType.TeamWorkspace,
      configs
    );
  }

  @Mutation(() => String)
  async grant(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('userId') userId: string,
    @Args('permission', { type: () => Permission }) permission: Permission
  ) {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      Permission.Owner
    );

    try {
      // lock to prevent concurrent invite and grant
      const lockFlag = `invite:${workspaceId}`;
      await using lock = await this.mutex.lock(lockFlag);
      if (!lock) {
        return new TooManyRequest();
      }

      const isMember = await this.permissions.isWorkspaceMember(
        workspaceId,
        userId,
        Permission.Read
      );
      if (isMember) {
        const result = await this.permissions.grant(
          workspaceId,
          userId,
          permission
        );

        if (result) {
          // TODO(@darkskygit): send team role changed mail
        }

        return result;
      } else {
        return new NotInSpace({ spaceId: workspaceId });
      }
    } catch (e) {
      this.logger.error('failed to invite user', e);
      return new TooManyRequest();
    }
  }

  @Mutation(() => Boolean)
  async declineInviteById(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('inviteId') inviteId: string
  ) {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      Permission.Admin
    );

    const owner = await this.permissions.getWorkspaceOwner(workspaceId);
    const invitee = await this.permissions.getWorkspaceInvitation(
      inviteId,
      workspaceId
    );

    if (!owner || !invitee) {
      throw new UserNotFound();
    }

    return this.permissions.declineWorkspaceInvitation(inviteId, workspaceId);
  }
}

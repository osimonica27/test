import { Logger } from '@nestjs/common';
import {
  Args,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Parent,
  registerEnumType,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { WorkspaceDoc as PrismaWorkspaceDoc } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

import {
  Cache,
  DocActionDenied,
  DocDefaultRoleCanNotBeOwner,
  ExpectToGrantDocUserRoles,
  ExpectToPublishDoc,
  ExpectToRevokeDocUserRoles,
  ExpectToRevokePublicDoc,
  ExpectToUpdateDocUserRole,
  paginate,
  Paginated,
  PaginationInput,
  registerObjectType,
} from '../../../base';
import { Models, PublicDocMode } from '../../../models';
import { CurrentUser } from '../../auth';
import {
  AccessController,
  DOC_ACTIONS,
  DocAction,
  DocRole,
} from '../../permission';
import { PublicUserType } from '../../user';
import { WorkspaceType } from '../types';
import {
  DotToUnderline,
  mapPermissionsToGraphqlPermissions,
} from './workspace';

registerEnumType(PublicDocMode, {
  name: 'PublicDocMode',
  description: 'The mode which the public doc default in',
});

@ObjectType()
class DocType implements Partial<PrismaWorkspaceDoc> {
  @Field(() => String, { name: 'id' })
  docId!: string;

  @Field()
  workspaceId!: string;

  @Field(() => PublicDocMode)
  mode!: PublicDocMode;

  @Field()
  public!: boolean;

  @Field(() => DocRole)
  defaultRole!: DocRole;
}

@InputType()
class GrantDocUserRolesInput {
  @Field(() => String)
  docId!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => DocRole)
  role!: DocRole;

  @Field(() => [String])
  userIds!: string[];
}

@InputType()
class UpdateDocUserRoleInput {
  @Field(() => String)
  docId!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => DocRole)
  role!: DocRole;
}

@InputType()
class RevokeDocUserRoleInput {
  @Field(() => String)
  docId!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  userId!: string;
}

@InputType()
class UpdateDocDefaultRoleInput {
  @Field(() => String)
  docId!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => DocRole)
  role!: DocRole;
}

@ObjectType()
class GrantedDocUserType {
  @Field(() => DocRole, { name: 'role' })
  type!: DocRole;

  @Field(() => PublicUserType)
  user!: PublicUserType;
}

@ObjectType()
class PaginatedGrantedDocUserType extends Paginated(GrantedDocUserType) {}

const DocPermissions = registerObjectType<
  Record<DotToUnderline<DocAction>, boolean>
>(
  Object.fromEntries(
    DOC_ACTIONS.map(action => [
      action.replaceAll('.', '_'),
      {
        type: () => Boolean,
        options: {
          name: action.replaceAll('.', '_'),
        },
      },
    ])
  ),
  { name: 'DocPermissions' }
);

@Resolver(() => WorkspaceType)
export class WorkspaceDocResolver {
  private readonly logger = new Logger(WorkspaceDocResolver.name);

  constructor(
    /**
     * @deprecated migrate to models
     */
    private readonly prisma: PrismaClient,
    private readonly ac: AccessController,
    private readonly models: Models,
    private readonly cache: Cache
  ) {}

  @ResolveField(() => [DocType], {
    complexity: 2,
    deprecationReason: 'use [WorkspaceType.publicDocs] instead',
  })
  async publicPages(@Parent() workspace: WorkspaceType) {
    return this.publicDocs(workspace);
  }

  @ResolveField(() => [DocType], {
    description: 'Get public docs of a workspace',
    complexity: 2,
  })
  async publicDocs(@Parent() workspace: WorkspaceType) {
    return this.models.workspace.getPublicDocs(workspace.id);
  }

  @ResolveField(() => DocType, {
    description: 'Get public page of a workspace by page id.',
    complexity: 2,
    nullable: true,
    deprecationReason: 'use [WorkspaceType.doc] instead',
  })
  async publicPage(
    @Parent() workspace: WorkspaceType,
    @Args('pageId') pageId: string
  ) {
    return this.doc(workspace, pageId);
  }

  @ResolveField(() => DocType, {
    description: 'Get get with given id',
    complexity: 2,
  })
  async doc(
    @Parent() workspace: WorkspaceType,
    @Args('docId') docId: string
  ): Promise<DocType> {
    const doc = await this.models.workspace.getDoc(workspace.id, docId);

    if (doc) {
      return doc;
    }

    await this.tryFixDocOwner(workspace.id, docId);

    return {
      docId,
      workspaceId: workspace.id,
      mode: PublicDocMode.Page,
      public: false,
      defaultRole: DocRole.Manager,
    };
  }

  @Mutation(() => DocType, {
    deprecationReason: 'use publishDoc instead',
  })
  async publishPage(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('pageId') pageId: string,
    @Args({
      name: 'mode',
      type: () => PublicDocMode,
      nullable: true,
      defaultValue: PublicDocMode.Page,
    })
    mode: PublicDocMode
  ) {
    return this.publishDoc(user, workspaceId, pageId, mode);
  }

  @Mutation(() => DocType)
  async publishDoc(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('docId') docId: string,
    @Args({
      name: 'mode',
      type: () => PublicDocMode,
      nullable: true,
      defaultValue: PublicDocMode.Page,
    })
    mode: PublicDocMode
  ) {
    if (workspaceId === docId) {
      this.logger.error('Expect to publish doc, but it is a workspace', {
        workspaceId,
        docId,
      });
      throw new ExpectToPublishDoc();
    }

    await this.ac.user(user.id).doc(workspaceId, docId).assert('Doc.Publish');

    const doc = await this.models.workspace.publishDoc(
      workspaceId,
      docId,
      mode
    );

    this.logger.log(
      `Publish page ${docId} with mode ${mode} in workspace ${workspaceId}`
    );

    return doc;
  }

  @Mutation(() => DocType, {
    deprecationReason: 'use revokePublicDoc instead',
  })
  async revokePublicPage(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('docId') docId: string
  ) {
    return this.revokePublicDoc(user, workspaceId, docId);
  }

  @Mutation(() => DocType)
  async revokePublicDoc(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('docId') docId: string
  ) {
    if (workspaceId === docId) {
      this.logger.error('Expect to revoke public doc, but it is a workspace', {
        workspaceId,
        docId,
      });
      throw new ExpectToRevokePublicDoc('Expect doc not to be workspace');
    }

    await this.ac.user(user.id).doc(workspaceId, docId).assert('Doc.Publish');

    const doc = await this.models.workspace.revokePublicDoc(workspaceId, docId);

    this.logger.log(`Revoke public doc ${docId} in workspace ${workspaceId}`);

    return doc;
  }

  private async tryFixDocOwner(workspaceId: string, docId: string) {
    const allowed = await this.cache.setnx(
      `fixingOwner:${workspaceId}:${docId}`,
      1,
      // TODO(@forehalo): we definitely need a timer helper
      { ttl: 1000 * 60 * 60 * 24 }
    );

    // fixed by other instance
    if (!allowed) {
      return;
    }

    const exists = await this.models.doc.exists(workspaceId, docId);

    // skip if doc not even exists
    if (!exists) {
      return;
    }

    const owner = await this.models.docUser.getOwner(workspaceId, docId);

    // skip if owner already exists
    if (owner) {
      return;
    }

    // try snapshot.createdBy first
    const snapshot = await this.prisma.snapshot.findUnique({
      select: {
        createdBy: true,
      },
      where: {
        workspaceId_id: {
          workspaceId,
          id: docId,
        },
      },
    });

    let fixedOwner = snapshot?.createdBy;

    // try workspace.owner
    if (!fixedOwner) {
      const owner = await this.models.workspaceUser.getOwner(workspaceId);
      fixedOwner = owner.id;
    }

    await this.models.docUser.setOwner(workspaceId, docId, fixedOwner);

    this.logger.debug(
      `Fixed doc owner for ${docId} in workspace ${workspaceId}, new owner: ${fixedOwner}`
    );
  }
}

@Resolver(() => DocType)
export class DocResolver {
  private readonly logger = new Logger(DocResolver.name);

  constructor(
    private readonly ac: AccessController,
    private readonly models: Models
  ) {}

  @ResolveField(() => DocPermissions)
  async permissions(
    @CurrentUser() user: CurrentUser,
    @Parent() doc: DocType
  ): Promise<InstanceType<typeof DocPermissions>> {
    const { permissions } = await this.ac.user(user.id).doc(doc).permissions();

    return mapPermissionsToGraphqlPermissions(permissions);
  }

  @ResolveField(() => PaginatedGrantedDocUserType, {
    description: 'paginated doc granted users list',
    complexity: 4,
  })
  async grantedUsersList(
    @CurrentUser() user: CurrentUser,
    @Parent() doc: DocType,
    @Args('pagination', PaginationInput.decode) pagination: PaginationInput
  ): Promise<PaginatedGrantedDocUserType> {
    await this.ac.user(user.id).doc(doc).assert('Doc.Users.Read');

    const [permissions, totalCount] = await this.models.docUser.paginate(
      doc.workspaceId,
      doc.docId,
      pagination
    );

    const publicUsers = await this.models.user.getPublicUsers(
      permissions.map(p => p.userId)
    );

    const publicUsersMap = new Map(publicUsers.map(pu => [pu.id, pu]));

    return paginate(
      permissions.map(p => ({
        ...p,
        user: publicUsersMap.get(p.userId) as PublicUserType,
      })),
      'createdAt',
      pagination,
      totalCount
    );
  }

  @Mutation(() => Boolean)
  async grantDocUserRoles(
    @CurrentUser() user: CurrentUser,
    @Args('input') input: GrantDocUserRolesInput
  ): Promise<boolean> {
    const pairs = {
      spaceId: input.workspaceId,
      docId: input.docId,
    };

    if (input.workspaceId === input.docId) {
      this.logger.error(
        'Expect to grant doc user roles, but it is a workspace',
        pairs
      );
      throw new ExpectToGrantDocUserRoles(
        pairs,
        'Expect doc not to be workspace'
      );
    }

    await this.ac.user(user.id).doc(input).assert('Doc.Users.Manage');

    await this.models.docUser.batchSetUserRoles(
      input.workspaceId,
      input.docId,
      input.userIds,
      input.role
    );

    const info = {
      ...pairs,
      userIds: input.userIds,
      role: input.role,
    };
    this.logger.log(`Grant doc user roles (${JSON.stringify(info)})`);
    return true;
  }

  @Mutation(() => Boolean)
  async revokeDocUserRoles(
    @CurrentUser() user: CurrentUser,
    @Args('input') input: RevokeDocUserRoleInput
  ): Promise<boolean> {
    const pairs = {
      spaceId: input.workspaceId,
      docId: input.docId,
    };
    if (input.workspaceId === input.docId) {
      this.logger.error(
        'Expect to revoke doc user roles, but it is a workspace',
        pairs
      );
      throw new ExpectToRevokeDocUserRoles(
        pairs,
        'Expect doc not to be workspace'
      );
    }
    await this.ac.user(user.id).doc(input).assert('Doc.Users.Manage');

    await this.models.docUser.delete(
      input.workspaceId,
      input.docId,
      input.userId
    );

    const info = {
      ...pairs,
      userId: input.userId,
    };
    this.logger.log(`Revoke doc user roles (${JSON.stringify(info)})`);
    return true;
  }

  @Mutation(() => Boolean)
  async updateDocUserRole(
    @CurrentUser() user: CurrentUser,
    @Args('input') input: UpdateDocUserRoleInput
  ): Promise<boolean> {
    const pairs = {
      spaceId: input.workspaceId,
      docId: input.docId,
    };
    if (input.workspaceId === input.docId) {
      this.logger.error(
        'Expect to update doc user role, but it is a workspace',
        pairs
      );
      throw new ExpectToUpdateDocUserRole(
        pairs,
        'Expect doc not to be workspace'
      );
    }

    const info = {
      ...pairs,
      userId: input.userId,
      role: input.role,
    };

    if (input.role === DocRole.Owner) {
      await this.ac.user(user.id).doc(input).assert('Doc.TransferOwner');
      await this.models.docUser.setOwner(
        input.workspaceId,
        input.docId,
        input.userId
      );
      this.logger.log(`Transfer doc owner (${JSON.stringify(info)})`);
    } else {
      await this.ac.user(user.id).doc(input).assert('Doc.Users.Manage');
      await this.models.docUser.set(
        input.workspaceId,
        input.docId,
        input.userId,
        input.role
      );
      this.logger.log(`Update doc user role (${JSON.stringify(info)})`);
    }

    return true;
  }

  @Mutation(() => Boolean)
  async updateDocDefaultRole(
    @CurrentUser() user: CurrentUser,
    @Args('input') input: UpdateDocDefaultRoleInput
  ) {
    if (input.role === DocRole.Owner) {
      this.logger.log(
        `Doc default role can not be owner (${JSON.stringify(input)})`
      );
      throw new DocDefaultRoleCanNotBeOwner();
    }
    const pairs = {
      spaceId: input.workspaceId,
      docId: input.docId,
    };
    if (input.workspaceId === input.docId) {
      this.logger.error(
        'Expect to update page default role, but it is a workspace',
        pairs
      );
      throw new ExpectToUpdateDocUserRole(
        pairs,
        'Expect doc not to be workspace'
      );
    }
    try {
      await this.ac.user(user.id).doc(input).assert('Doc.Users.Manage');
    } catch (error) {
      if (error instanceof DocActionDenied) {
        this.logger.log(
          `User does not have permission to update page default role (${JSON.stringify(
            {
              ...pairs,
              userId: user.id,
            }
          )})`
        );
      }
      throw error;
    }
    await this.models.workspace.setDocDefaultRole(
      input.workspaceId,
      input.docId,
      input.role
    );
    return true;
  }
}

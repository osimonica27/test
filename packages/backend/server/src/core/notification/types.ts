import {
  createUnionType,
  Field,
  ID,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

import { Paginated } from '../../base';
import {
  InvitationNotificationBody,
  Notification,
  NotificationLevel,
  NotificationType,
} from '../../models';
import { WorkspaceDocInfo } from '../doc/reader';
import { PublicUserType } from '../user';

registerEnumType(NotificationLevel, {
  name: 'NotificationLevel',
  description: 'Notification level',
});

registerEnumType(NotificationType, {
  name: 'NotificationType',
  description: 'Notification type',
});

@ObjectType()
export class NotificationWorkspaceType implements WorkspaceDocInfo {
  @Field(() => ID)
  id!: string;

  @Field({ description: 'Workspace name' })
  name!: string;

  @Field(() => String, {
    description: 'Workspace avatar url',
    nullable: true,
  })
  avatarUrl?: string;
}

@ObjectType()
export abstract class BaseNotificationBodyType {
  @Field(() => NotificationType, {
    description: 'The type of the notification',
  })
  type!: NotificationType;

  @Field(() => PublicUserType, {
    nullable: true,
    description:
      'The user who created the notification, maybe null when user is deleted or sent by system',
  })
  createdByUser?: PublicUserType;

  @Field(() => NotificationWorkspaceType, {
    nullable: true,
  })
  workspace?: NotificationWorkspaceType;
}

@ObjectType()
export class MentionDocType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, {
    nullable: true,
  })
  blockId?: string;

  @Field(() => String, {
    nullable: true,
  })
  elementId?: string;
}

@ObjectType()
export class MentionNotificationBodyType extends BaseNotificationBodyType {
  @Field(() => MentionDocType)
  doc!: MentionDocType;
}

@ObjectType()
export class InvitationNotificationBodyType
  extends BaseNotificationBodyType
  implements Partial<InvitationNotificationBody>
{
  @Field(() => ID)
  inviteId!: string;
}

@ObjectType()
export class InvitationAcceptedNotificationBodyType
  extends BaseNotificationBodyType
  implements Partial<InvitationNotificationBody>
{
  @Field(() => String)
  inviteId!: string;
}

@ObjectType()
export class InvitationBlockedNotificationBodyType
  extends BaseNotificationBodyType
  implements Partial<InvitationNotificationBody>
{
  @Field(() => String)
  inviteId!: string;
}

export const UnionNotificationBodyType = createUnionType({
  name: 'UnionNotificationBodyType',
  types: () =>
    [
      MentionNotificationBodyType,
      InvitationNotificationBodyType,
      InvitationAcceptedNotificationBodyType,
      InvitationBlockedNotificationBodyType,
    ] as const,
});

@ObjectType()
export class NotificationObjectType implements Partial<Notification> {
  @Field(() => ID)
  id!: string;

  @Field(() => NotificationLevel, {
    description: 'The level of the notification',
  })
  level!: NotificationLevel;

  @Field(() => NotificationType, {
    description: 'The type of the notification',
  })
  type!: NotificationType;

  @Field({ description: 'Whether the notification has been read' })
  read!: boolean;

  @Field({ description: 'The created at time of the notification' })
  createdAt!: Date;

  @Field({ description: 'The updated at time of the notification' })
  updatedAt!: Date;

  @Field(() => GraphQLJSONObject, {
    description:
      'The body of the notification, different types have different fields, see UnionNotificationBodyType',
  })
  body!: object;
}

@ObjectType()
export class PaginatedNotificationObjectType extends Paginated(
  NotificationObjectType
) {}

@InputType()
export class MentionDocInput {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, {
    description: 'The block id in the doc',
    nullable: true,
  })
  blockId?: string;

  @Field(() => String, {
    description: 'The element id in the doc',
    nullable: true,
  })
  elementId?: string;
}

@InputType()
export class MentionInput {
  @Field()
  userId!: string;

  @Field()
  workspaceId!: string;

  @Field(() => MentionDocInput)
  doc!: MentionDocInput;
}

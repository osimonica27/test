import { randomUUID } from 'node:crypto';

import ava, { TestFn } from 'ava';
import Sinon from 'sinon';

import {
  createTestingModule,
  type TestingModule,
} from '../../../__tests__/utils';
import {
  Models,
  User,
  Workspace,
  WorkspaceMemberStatus,
} from '../../../models';
import { WorkspaceRole } from '../../permission';
import { NotificationJob } from '../job';
import { NotificationService } from '../service';

interface Context {
  module: TestingModule;
  notificationJob: NotificationJob;
  notificationService: NotificationService;
  models: Models;
}

const test = ava as TestFn<Context>;

test.before(async t => {
  const module = await createTestingModule();
  t.context.module = module;
  t.context.notificationJob = module.get(NotificationJob);
  t.context.notificationService = module.get(NotificationService);
  t.context.models = module.get(Models);
});

let owner: User;
let member: User;
let workspace: Workspace;

test.beforeEach(async t => {
  await t.context.module.initTestingDB();
  owner = await t.context.models.user.create({
    email: `${randomUUID()}@affine.pro`,
  });
  member = await t.context.models.user.create({
    email: `${randomUUID()}@affine.pro`,
  });
  workspace = await t.context.models.workspace.create(owner.id);
});

test.afterEach.always(() => {
  Sinon.restore();
});

test.after.always(async t => {
  await t.context.module.close();
});

test('should ignore create invitation notification when inviteId not exists', async t => {
  const { notificationJob, notificationService } = t.context;
  const spy = Sinon.spy(notificationService, 'createInvitation');
  await notificationJob.sendInvitation({
    inviterId: owner.id,
    inviteId: `not-exists-${randomUUID()}`,
  });
  t.is(spy.callCount, 0);
});

test('should create invitation notification', async t => {
  const { notificationJob, notificationService } = t.context;
  const invite = await t.context.models.workspaceUser.set(
    workspace.id,
    member.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.Pending
  );
  const spy = Sinon.spy(notificationService, 'createInvitation');
  await notificationJob.sendInvitation({
    inviterId: owner.id,
    inviteId: invite.id,
  });
  t.is(spy.callCount, 1);
  t.is(spy.firstCall.args[0].userId, member.id);
  t.is(spy.firstCall.args[0].body.workspaceId, workspace.id);
  t.is(spy.firstCall.args[0].body.createdByUserId, owner.id);
});

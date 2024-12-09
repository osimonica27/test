/// <reference types="../src/global.d.ts" />

import { INestApplication } from '@nestjs/common';
import { WorkspaceMemberStatus } from '@prisma/client';
import type { TestFn } from 'ava';
import ava from 'ava';

import { AppModule } from '../src/app.module';
import { AuthService } from '../src/core/auth';
import { Permission, PermissionService } from '../src/core/permission';
import {
  QuotaManagementService,
  QuotaService,
  QuotaType,
} from '../src/core/quota';
import {
  acceptInviteById,
  createTestingApp,
  createWorkspace,
  grantMember,
  inviteUser,
  inviteUsers,
  leaveWorkspace,
  PermissionEnum,
  signUp,
} from './utils';

const test = ava as TestFn<{
  app: INestApplication;
  auth: AuthService;
  quota: QuotaService;
  quotaManager: QuotaManagementService;
  permissions: PermissionService;
}>;

test.beforeEach(async t => {
  const { app } = await createTestingApp({
    imports: [AppModule],
  });

  const quota = app.get(QuotaService);
  const quotaManager = app.get(QuotaManagementService);
  const permissions = app.get(PermissionService);
  const auth = app.get(AuthService);

  t.context.app = app;
  t.context.quota = quota;
  t.context.quotaManager = quotaManager;
  t.context.permissions = permissions;
  t.context.auth = auth;
});

test.afterEach.always(async t => {
  await t.context.app.close();
});

const init = async (app: INestApplication, memberLimit = 10) => {
  const owner = await signUp(app, 'test', 'test@affine.pro', '123456');
  const ws = await createWorkspace(app, owner.token.token);

  const quota = app.get(QuotaManagementService);
  await quota.addTeamWorkspace(ws.id, 'test');
  await quota.updateWorkspaceConfig(ws.id, QuotaType.TeamPlanV1, {
    memberLimit,
  });

  const invite = async (
    email: string,
    permission: PermissionEnum = 'Write'
  ) => {
    const member = await signUp(app, email.split('@')[0], email, '123456');
    const inviteId = await inviteUser(
      app,
      owner.token.token,
      ws.id,
      member.email,
      permission
    );
    await acceptInviteById(app, ws.id, inviteId);
    return member;
  };

  const inviteBatch = async (emails: string[]) => {
    const members = [];
    for (const email of emails) {
      const member = await signUp(app, email.split('@')[0], email, '123456');
      members.push(member);
    }
    const invites = await inviteUsers(app, owner.token.token, ws.id, emails);
    for (const { inviteId } of invites) {
      if (!inviteId) {
        throw new Error('Invite failed');
      }
      await acceptInviteById(app, ws.id, inviteId);
    }

    return members;
  };

  const admin = await invite('admin@affine.pro', 'Admin');
  const write = await invite('member1@affine.pro');
  const read = await invite('member2@affine.pro', 'Read');

  return { invite, inviteBatch, owner, ws, admin, write, read };
};

test('should be able to check seat limit', async t => {
  const { app, permissions, quotaManager } = t.context;
  const { invite, inviteBatch, ws } = await init(app, 4);

  {
    // invite
    await t.throwsAsync(
      invite('member3@affine.pro', 'Read'),
      { message: 'You have exceeded your workspace member quota.' },
      'should throw error if exceed member limit'
    );
    await quotaManager.updateWorkspaceConfig(ws.id, QuotaType.TeamPlanV1, {
      memberLimit: 5,
    });
    await t.notThrowsAsync(
      invite('member4@affine.pro', 'Read'),
      'should not throw error if not exceed member limit'
    );
  }

  {
    const members = inviteBatch(['member5@affine.pro']);
    // invite batch
    await t.notThrowsAsync(
      members,
      'should not throw error in batch invite event reach limit'
    );

    t.is(
      await permissions.getWorkspaceMemberStatus(ws.id, (await members)[0].id),
      WorkspaceMemberStatus.NeedMoreSeat,
      'should be able to check member status'
    );
  }
});

test('should be able to grant team member permission', async t => {
  const { app, permissions } = t.context;
  const { owner, ws, admin, write, read } = await init(app);

  await t.throwsAsync(
    grantMember(app, read.token.token, ws.id, write.id, 'Write'),
    { instanceOf: Error },
    'should throw error if not owner'
  );
  await t.throwsAsync(
    grantMember(app, write.token.token, ws.id, read.id, 'Write'),
    { instanceOf: Error },
    'should throw error if not owner'
  );
  await t.throwsAsync(
    grantMember(app, admin.token.token, ws.id, read.id, 'Write'),
    { instanceOf: Error },
    'should throw error if not owner'
  );

  {
    // owner should be able to grant permission
    t.true(
      await permissions.tryCheckWorkspaceIs(ws.id, read.id, Permission.Read),
      'should be able to check permission'
    );
    t.truthy(
      await grantMember(app, owner.token.token, ws.id, read.id, 'Admin'),
      'should be able to grant permission'
    );
    t.true(
      await permissions.tryCheckWorkspaceIs(ws.id, read.id, Permission.Admin),
      'should be able to check permission'
    );
  }
});

test('should be able to leave workspace', async t => {
  const { app } = t.context;
  const { owner, ws, admin, write, read } = await init(app);

  t.false(
    await leaveWorkspace(app, owner.token.token, ws.id),
    'owner should not be able to leave workspace'
  );
  t.true(
    await leaveWorkspace(app, admin.token.token, ws.id),
    'admin should be able to leave workspace'
  );
  t.true(
    await leaveWorkspace(app, write.token.token, ws.id),
    'write should be able to leave workspace'
  );
  t.true(
    await leaveWorkspace(app, read.token.token, ws.id),
    'read should be able to leave workspace'
  );
});

import { TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import ava, { TestFn } from 'ava';

import { Config } from '../../base/config';
import { Permission, PublicPageMode } from '../../core/permission/types';
import { UserModel } from '../../models/user';
import { WorkspaceModel } from '../../models/workspace';
import { WorkspacePageModel } from '../../models/workspace-page';
import { createTestingModule, initTestingDB } from '../utils';

interface Context {
  config: Config;
  module: TestingModule;
  db: PrismaClient;
  user: UserModel;
  workspace: WorkspaceModel;
  workspacePage: WorkspacePageModel;
}

const test = ava as TestFn<Context>;

test.before(async t => {
  const module = await createTestingModule({
    providers: [UserModel, WorkspaceModel],
  });

  t.context.user = module.get(UserModel);
  t.context.workspace = module.get(WorkspaceModel);
  t.context.workspacePage = module.get(WorkspacePageModel);
  t.context.db = module.get(PrismaClient);
  t.context.config = module.get(Config);
  t.context.module = module;
});

test.beforeEach(async t => {
  await initTestingDB(t.context.db);
});

test.after(async t => {
  await t.context.module.close();
});

test('should create workspace page with default mode and public false', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const page = await t.context.workspacePage.createOrUpdate(
    workspace.id,
    'page1'
  );
  t.is(page.workspaceId, workspace.id);
  t.is(page.pageId, 'page1');
  t.is(page.mode, PublicPageMode.Page);
  t.is(page.public, false);
});

test('should update workspace page', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const page = await t.context.workspacePage.createOrUpdate(
    workspace.id,
    'page1'
  );
  const data = {
    mode: PublicPageMode.Edgeless,
    public: true,
  };
  await t.context.workspacePage.createOrUpdate(workspace.id, 'page1', data);
  const page1 = await t.context.workspacePage.get(workspace.id, 'page1');
  t.deepEqual(page1, {
    ...page,
    ...data,
  });
});

test('should get null when workspace page not exists', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  const page = await t.context.workspacePage.get(workspace.id, 'page1');
  t.is(page, null);
});

test('should get workspace page by id and public flag', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  await t.context.workspacePage.createOrUpdate(workspace.id, 'page1');
  await t.context.workspacePage.createOrUpdate(workspace.id, 'page2', {
    public: true,
  });
  let page1 = await t.context.workspacePage.get(workspace.id, 'page1');
  t.is(page1!.public, false);
  page1 = await t.context.workspacePage.get(workspace.id, 'page1', true);
  t.is(page1, null);
  let page2 = await t.context.workspacePage.get(workspace.id, 'page2', true);
  t.is(page2!.public, true);
  page2 = await t.context.workspacePage.get(workspace.id, 'page2', false);
  t.is(page2, null);
});

test('should get public workspace page count', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  await t.context.workspacePage.createOrUpdate(workspace.id, 'page1', {
    public: true,
  });
  await t.context.workspacePage.createOrUpdate(workspace.id, 'page2', {
    public: true,
  });
  await t.context.workspacePage.createOrUpdate(workspace.id, 'page3');
  const count = await t.context.workspacePage.getPublicsCount(workspace.id);
  t.is(count, 2);
});

test('should get public pages of a workspace', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  await t.context.workspacePage.createOrUpdate(workspace.id, 'page1', {
    public: true,
  });
  await t.context.workspacePage.createOrUpdate(workspace.id, 'page2', {
    public: true,
  });
  await t.context.workspacePage.createOrUpdate(workspace.id, 'page3');
  const pages = await t.context.workspacePage.findPublics(workspace.id);
  t.is(pages.length, 2);
  t.deepEqual(pages.map(p => p.pageId).sort(), ['page1', 'page2']);
});

test('should grant a member to access a page', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  await t.context.workspacePage.createOrUpdate(workspace.id, 'page1', {
    public: true,
  });
  const member = await t.context.user.create({
    email: 'test1@affine.pro',
  });
  await t.context.workspacePage.grantMember(workspace.id, 'page1', member.id);
  let hasAccess = await t.context.workspacePage.isMember(
    workspace.id,
    'page1',
    member.id
  );
  t.true(hasAccess);
  hasAccess = await t.context.workspacePage.isMember(
    workspace.id,
    'page1',
    user.id,
    Permission.Write
  );
  t.false(hasAccess);
  // grant write permission
  await t.context.workspacePage.grantMember(
    workspace.id,
    'page1',
    user.id,
    Permission.Write
  );
  hasAccess = await t.context.workspacePage.isMember(
    workspace.id,
    'page1',
    user.id,
    Permission.Write
  );
  t.true(hasAccess);
  hasAccess = await t.context.workspacePage.isMember(
    workspace.id,
    'page1',
    user.id,
    Permission.Read
  );
  t.true(hasAccess);
  // delete member
  const count = await t.context.workspacePage.deleteMember(
    workspace.id,
    'page1',
    user.id
  );
  t.is(count, 1);
  hasAccess = await t.context.workspacePage.isMember(
    workspace.id,
    'page1',
    user.id
  );
  t.false(hasAccess);
});

test('should not delete owner from page', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const workspace = await t.context.workspace.create(user.id);
  await t.context.workspacePage.createOrUpdate(workspace.id, 'page1', {
    public: true,
  });
  await t.context.workspacePage.grantMember(
    workspace.id,
    'page1',
    user.id,
    Permission.Owner
  );
  const count = await t.context.workspacePage.deleteMember(
    workspace.id,
    'page1',
    user.id
  );
  t.is(count, 0);
});

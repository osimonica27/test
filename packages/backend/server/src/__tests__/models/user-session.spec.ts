import { TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import ava, { TestFn } from 'ava';

import { Config } from '../../base/config';
import { UserModel } from '../../models/user';
import { UserSessionModel } from '../../models/user-session';
import { createTestingModule, initTestingDB } from '../utils';

interface Context {
  module: TestingModule;
  user: UserModel;
  userSession: UserSessionModel;
  db: PrismaClient;
  config: Config;
}

const test = ava as TestFn<Context>;

test.before(async t => {
  const module = await createTestingModule({
    providers: [UserModel, UserSessionModel],
  });

  t.context.user = module.get(UserModel);
  t.context.userSession = module.get(UserSessionModel);
  t.context.module = module;
  t.context.db = t.context.module.get(PrismaClient);
  t.context.config = t.context.module.get(Config);
});

test.beforeEach(async t => {
  await initTestingDB(t.context.module.get(PrismaClient));
});

test.after(async t => {
  await t.context.module.close();
});

test('should create a new userSession', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const session = await t.context.db.session.create({
    data: {},
  });
  const userSession = await t.context.userSession.createOrRefresh(
    session.id,
    user.id
  );
  t.is(userSession.sessionId, session.id);
  t.is(userSession.userId, user.id);
  t.not(userSession.expiresAt, null);
});

test('should refresh exists userSession', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const session = await t.context.db.session.create({
    data: {},
  });
  const userSession = await t.context.userSession.createOrRefresh(
    session.id,
    user.id
  );
  t.is(userSession.sessionId, session.id);
  t.is(userSession.userId, user.id);
  t.not(userSession.expiresAt, null);

  const existsUserSession = await t.context.userSession.createOrRefresh(
    session.id,
    user.id
  );
  t.is(existsUserSession.sessionId, session.id);
  t.is(existsUserSession.userId, user.id);
  t.not(existsUserSession.expiresAt, null);
  t.is(existsUserSession.id, userSession.id);
  t.assert(
    existsUserSession.expiresAt!.getTime() > userSession.expiresAt!.getTime()
  );
});

test('should not refresh userSession when expires time not hit ttr', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const session = await t.context.db.session.create({
    data: {},
  });
  const userSession = await t.context.userSession.createOrRefresh(
    session.id,
    user.id
  );
  let newExpiresAt = await t.context.userSession.refreshIfNeeded(userSession);
  t.is(newExpiresAt, undefined);
  userSession.expiresAt = new Date(
    userSession.expiresAt!.getTime() - t.context.config.auth.session.ttr * 1000
  );
  newExpiresAt = await t.context.userSession.refreshIfNeeded(userSession);
  t.is(newExpiresAt, undefined);
});

test('should not refresh userSession when expires time hit ttr', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const session = await t.context.db.session.create({
    data: {},
  });
  const userSession = await t.context.userSession.createOrRefresh(
    session.id,
    user.id
  );
  const ttr = t.context.config.auth.session.ttr * 2;
  userSession.expiresAt = new Date(
    userSession.expiresAt!.getTime() - ttr * 1000
  );
  const newExpiresAt = await t.context.userSession.refreshIfNeeded(userSession);
  t.not(newExpiresAt, undefined);
});

test('should find userSessions without user property by default', async t => {
  const session = await t.context.db.session.create({
    data: {},
  });
  const count = 10;
  for (let i = 0; i < count; i++) {
    const user = await t.context.user.create({
      email: `test${i}@affine.pro`,
    });
    await t.context.userSession.createOrRefresh(session.id, user.id);
  }
  const userSessions = await t.context.userSession.findManyBySessionId(
    session.id
  );
  t.is(userSessions.length, count);
  for (const userSession of userSessions) {
    t.is(userSession.sessionId, session.id);
    t.is(userSession.user, undefined);
  }
});

test('should find userSessions include user property', async t => {
  const session = await t.context.db.session.create({
    data: {},
  });
  const count = 10;
  for (let i = 0; i < count; i++) {
    const user = await t.context.user.create({
      email: `test${i}@affine.pro`,
    });
    await t.context.userSession.createOrRefresh(session.id, user.id);
  }
  const userSessions = await t.context.userSession.findManyBySessionId(
    session.id,
    { user: true }
  );
  t.is(userSessions.length, count);
  for (const userSession of userSessions) {
    t.is(userSession.sessionId, session.id);
    t.not(userSession.user, undefined);
  }
});

test('should delete userSession success by userId', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const session = await t.context.db.session.create({
    data: {},
  });
  await t.context.userSession.createOrRefresh(session.id, user.id);
  let count = await t.context.userSession.delete(user.id);
  t.is(count, 1);
  count = await t.context.userSession.delete(user.id);
  t.is(count, 0);
});

test('should delete userSession success by userId and sessionId', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const session = await t.context.db.session.create({
    data: {},
  });
  await t.context.userSession.createOrRefresh(session.id, user.id);
  const count = await t.context.userSession.delete(user.id, session.id);
  t.is(count, 1);
});

test('should delete userSession fail when sessionId not match', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const session = await t.context.db.session.create({
    data: {},
  });
  await t.context.userSession.createOrRefresh(session.id, user.id);
  const count = await t.context.userSession.delete(
    user.id,
    'not-exists-session-id'
  );
  t.is(count, 0);
});

test('should cleanup expired userSessions', async t => {
  const user = await t.context.user.create({
    email: 'test@affine.pro',
  });
  const session = await t.context.db.session.create({
    data: {},
  });
  const userSession = await t.context.userSession.createOrRefresh(
    session.id,
    user.id
  );
  await t.context.userSession.cleanExpiredUserSessions();
  let count = await t.context.db.userSession.count();
  t.is(count, 1);

  // Set expiresAt to past time
  await t.context.db.userSession.update({
    where: { id: userSession.id },
    data: { expiresAt: new Date('2022-01-01') },
  });
  await t.context.userSession.cleanExpiredUserSessions();
  count = await t.context.db.userSession.count();
  t.is(count, 0);
});

import { TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import ava, { TestFn } from 'ava';

import { SessionModel } from '../../models/session';
import { createTestingModule, initTestingDB } from '../utils';

interface Context {
  module: TestingModule;
  session: SessionModel;
}

const test = ava as TestFn<Context>;

test.before(async t => {
  const module = await createTestingModule({
    providers: [SessionModel],
  });

  t.context.session = module.get(SessionModel);
  t.context.module = module;
});

test.beforeEach(async t => {
  await initTestingDB(t.context.module.get(PrismaClient));
});

test.after(async t => {
  await t.context.module.close();
});

test('should create a new session', async t => {
  const session = await t.context.session.create();
  t.truthy(session.id);
  t.truthy(session.createdAt);
  t.is(session.deprecated_expiresAt, null);
});

test('should get a exists session', async t => {
  const session = await t.context.session.create();
  const existsSession = await t.context.session.get(session.id);
  t.deepEqual(session, existsSession);
});

test('should get null when session id not exists', async t => {
  const session = await t.context.session.get('not-exists');
  t.is(session, null);
});

test('should delete a exists session', async t => {
  const session = await t.context.session.create();
  const count = await t.context.session.delete(session.id);
  t.is(count, 1);
  const existsSession = await t.context.session.get(session.id);
  t.is(existsSession, null);
});

test('should not delete a not exists session', async t => {
  const count = await t.context.session.delete('not-exists');
  t.is(count, 0);
});

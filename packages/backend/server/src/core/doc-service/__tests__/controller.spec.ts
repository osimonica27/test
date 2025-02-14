import { randomUUID } from 'node:crypto';

import { User, Workspace } from '@prisma/client';
import ava, { TestFn } from 'ava';

import { createTestingApp, type TestingApp } from '../../../__tests__/utils';
import { AppModule } from '../../../app.module';
import { CryptoHelper } from '../../../base';
import { ConfigModule } from '../../../base/config';
import { Models } from '../../../models';

const test = ava as TestFn<{
  models: Models;
  app: TestingApp;
  crypto: CryptoHelper;
}>;

test.before(async t => {
  const app = await createTestingApp({
    imports: [ConfigModule.forRoot(), AppModule],
  });

  t.context.models = app.get(Models);
  t.context.crypto = app.get(CryptoHelper);
  t.context.app = app;
});

let user: User;
let workspace: Workspace;

test.beforeEach(async t => {
  await t.context.app.initTestingDB();
  user = await t.context.models.user.create({
    email: 'test@affine.pro',
  });
  workspace = await t.context.models.workspace.create(user.id);
});

test.after.always(async t => {
  await t.context.app.close();
});

test('should forbid access to rpc api without access token', async t => {
  const { app } = t.context;

  await app
    .GET('/rpc/workspaces/123/docs/123')
    .expect({
      status: 403,
      code: 'Forbidden',
      type: 'NO_PERMISSION',
      name: 'ACCESS_DENIED',
      message: 'Invalid internal request',
    })
    .expect(403);
  t.pass();
});

test('should forbid access to rpc api with invalid access token', async t => {
  const { app } = t.context;

  await app
    .GET('/rpc/workspaces/123/docs/123')
    .set('x-access-token', 'invalid,wrong-signature')
    .expect({
      status: 403,
      code: 'Forbidden',
      type: 'NO_PERMISSION',
      name: 'ACCESS_DENIED',
      message: 'Invalid internal request',
    })
    .expect(403);
  t.pass();
});

test('should 404 when doc not found', async t => {
  const { app } = t.context;

  const workspaceId = '123';
  const docId = '123';
  await app
    .GET(`/rpc/workspaces/${workspaceId}/docs/${docId}`)
    .set('x-access-token', t.context.crypto.sign(docId))
    .expect({
      status: 404,
      code: 'Not Found',
      type: 'RESOURCE_NOT_FOUND',
      name: 'NOT_FOUND',
      message: 'Doc not found',
    })
    .expect(404);
  t.pass();
});

test('should return doc when found', async t => {
  const { app } = t.context;

  const docId = randomUUID();
  const timestamp = Date.now();
  await t.context.models.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob1 data'),
      timestamp,
      editorId: user.id,
    },
  ]);

  const res = await app
    .GET(`/rpc/workspaces/${workspace.id}/docs/${docId}`)
    .set('x-access-token', t.context.crypto.sign(docId))
    .set('x-cloud-trace-context', 'test-trace-id/span-id')
    .expect(200)
    .expect('x-request-id', 'test-trace-id')
    .expect('Content-Type', 'application/octet-stream');
  const bin = res.body as Buffer;
  t.is(bin.toString(), 'blob1 data');
  t.is(res.headers['x-doc-timestamp'], timestamp.toString());
  t.is(res.headers['x-doc-editor-id'], user.id);
});

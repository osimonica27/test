import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import type { InvitationType } from '../../src/core/workspaces';
import { gql } from './common';
import { PermissionEnum } from './utils';

export async function inviteUser(
  app: INestApplication,
  token: string,
  workspaceId: string,
  email: string,
  permission: PermissionEnum,
  sendInviteMail = false
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .auth(token, { type: 'bearer' })
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .send({
      query: `
            mutation {
              invite(workspaceId: "${workspaceId}", email: "${email}", permission: ${permission}, sendInviteMail: ${sendInviteMail})
            }
          `,
    })
    .expect(200);
  if (res.body.errors) {
    throw new Error(res.body.errors[0].message);
  }
  return res.body.data.invite;
}

export async function inviteUsers(
  app: INestApplication,
  token: string,
  workspaceId: string,
  emails: string[],
  sendInviteMail = false
): Promise<Array<{ email: string; inviteId?: string; sentSuccess?: boolean }>> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .auth(token, { type: 'bearer' })
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .send({
      query: `
          mutation inviteBatch($workspaceId: String!, $emails: [String!]!, $sendInviteMail: Boolean) {
            inviteBatch(
              workspaceId: $workspaceId
              emails: $emails
              sendInviteMail: $sendInviteMail
            ) {
              email
              inviteId
              sentSuccess
            }
          }
          `,
      variables: { workspaceId, emails, sendInviteMail },
    })
    .expect(200);
  if (res.body.errors) {
    throw new Error(res.body.errors[0].message);
  }
  return res.body.data.inviteBatch;
}

export async function inviteLink(
  app: INestApplication,
  token: string,
  workspaceId: string,
  expireTime: 'OneDay' | 'ThreeDays' | 'OneWeek' | 'OneMonth'
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .auth(token, { type: 'bearer' })
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .send({
      query: `
            mutation {
              createInviteLink(workspaceId: "${workspaceId}", expireTime: ${expireTime})
            }
          `,
    })
    .expect(200);
  if (res.body.errors) {
    throw new Error(res.body.errors[0].message);
  }
  return res.body.data.createInviteLink;
}

export async function acceptInviteById(
  app: INestApplication,
  workspaceId: string,
  inviteId: string,
  sendAcceptMail = false,
  token: string = ''
): Promise<boolean> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .auth(token, { type: 'bearer' })
    .send({
      query: `
            mutation {
              acceptInviteById(workspaceId: "${workspaceId}", inviteId: "${inviteId}", sendAcceptMail: ${sendAcceptMail})
            }
          `,
    })
    .expect(200);
  if (res.body.errors) {
    throw new Error(res.body.errors[0].message);
  }
  return res.body.data.acceptInviteById;
}

export async function leaveWorkspace(
  app: INestApplication,
  token: string,
  workspaceId: string,
  sendLeaveMail = false
): Promise<boolean> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .auth(token, { type: 'bearer' })
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .send({
      query: `
            mutation {
              leaveWorkspace(workspaceId: "${workspaceId}", workspaceName: "test workspace", sendLeaveMail: ${sendLeaveMail})
            }
          `,
    })
    .expect(200);
  if (res.body.errors) {
    throw new Error(res.body.errors[0].message);
  }
  return res.body.data.leaveWorkspace;
}

export async function revokeUser(
  app: INestApplication,
  token: string,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .auth(token, { type: 'bearer' })
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .send({
      query: `
            mutation {
              revoke(workspaceId: "${workspaceId}", userId: "${userId}")
            }
          `,
    })
    .expect(200);
  return res.body.data.revoke;
}

export async function getInviteInfo(
  app: INestApplication,
  token: string,
  inviteId: string
): Promise<InvitationType> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .auth(token, { type: 'bearer' })
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .send({
      query: `
            query {
              getInviteInfo(inviteId: "${inviteId}") {
                workspace {
                  id
                  name
                  avatar
                }
                user {
                  id
                  name
                  avatarUrl
                }
              }
            }
          `,
    })
    .expect(200);
  return res.body.data.getInviteInfo;
}

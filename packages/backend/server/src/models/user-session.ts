import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  type User,
  type UserSession as _UserSession,
} from '@prisma/client';

import { Config } from '../base';

export type UserSession = _UserSession & { user?: User };

@Injectable()
export class UserSessionModel {
  private readonly logger = new Logger(UserSessionModel.name);
  constructor(
    private readonly db: PrismaClient,
    private readonly config: Config
  ) {}

  async createOrRefresh(
    sessionId: string,
    userId: string,
    ttl = this.config.auth.session.ttl
  ) {
    const expiresAt = new Date(Date.now() + ttl * 1000);
    return await this.db.userSession.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
      update: {
        expiresAt,
      },
      create: {
        sessionId,
        userId,
        expiresAt,
      },
    });
  }

  async refreshIfNeeded(
    userSession: UserSession,
    ttr = this.config.auth.session.ttr
  ): Promise<Date | undefined> {
    if (
      userSession.expiresAt &&
      userSession.expiresAt.getTime() - Date.now() > ttr * 1000
    ) {
      // no need to refresh
      return;
    }

    const newExpiresAt = new Date(
      Date.now() + this.config.auth.session.ttl * 1000
    );
    await this.db.userSession.update({
      where: {
        id: userSession.id,
      },
      data: {
        expiresAt: newExpiresAt,
      },
    });

    // return the new expiresAt after refresh
    return newExpiresAt;
  }

  async findManyBySessionId(
    sessionId: string,
    include?: Prisma.UserSessionInclude
  ): Promise<UserSession[]> {
    return await this.db.userSession.findMany({
      where: {
        sessionId,
        OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
      },
      orderBy: {
        createdAt: 'asc',
      },
      include,
    });
  }

  async delete(userId: string, sessionId?: string) {
    const result = await this.db.userSession.deleteMany({
      where: {
        userId,
        sessionId,
      },
    });
    this.logger.log(
      `Deleted ${result.count} user sessions by userId: ${userId} and sessionId: ${sessionId}`
    );
    return result.count;
  }

  async cleanExpiredUserSessions() {
    const result = await this.db.userSession.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });
    this.logger.log(`Cleaned ${result.count} expired user sessions`);
  }
}

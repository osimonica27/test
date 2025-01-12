import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, type Session } from '@prisma/client';

export type { Session };

@Injectable()
export class SessionModel {
  private readonly logger = new Logger(SessionModel.name);
  constructor(private readonly db: PrismaClient) {}

  async create() {
    return await this.db.session.create({
      data: {},
    });
  }

  async get(id: string) {
    return await this.db.session.findFirst({
      where: {
        id,
      },
    });
  }

  async delete(id: string) {
    const { count } = await this.db.session.deleteMany({
      where: {
        id,
      },
    });
    this.logger.log(`Deleted ${count} sessions by id: ${id}`);
    return count;
  }
}

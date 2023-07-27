/// <reference types="./global.d.ts" />
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import {
  NextFunction,
  Request,
  Response,
  static as staticMiddleware,
} from 'express';
// @ts-expect-error graphql-upload is not typed
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';

import { AppModule } from './app';
import { Config } from './config';
import { REQUEST_ID } from './constants';
import { RedisIoAdapter } from './modules/sync/redis-adapter';

const { AFFINE_ENV } = process.env;

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  cors: true,
  bodyParser: true,
  logger: AFFINE_ENV === 'production' ? ['warn'] : ['verbose'],
});

const logger = new Logger('GlobalTimer');

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers[REQUEST_ID] || 'unknown';
  const now = process.hrtime();
  req.res = res; // used in logger-plugin.ts
  res.on('finish', () => {
    const delta = process.hrtime(now);
    const value = delta[0] + delta[1] / 1e9;
    logger.log(
      `${REQUEST_ID}: ${requestId}, path: ${req.path}, total time cost in seconds: ${value}`
    );
  });
  next();
});

app.use(
  graphqlUploadExpress({
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 5,
  })
);

app.use(cookieParser());

const config = app.get(Config);

const host = config.host ?? 'localhost';
const port = config.port ?? 3010;

if (!config.objectStorage.r2.enabled) {
  app.use('/assets', staticMiddleware(config.objectStorage.fs.path));
}

if (config.redis.enabled) {
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(
    config.redis.host,
    config.redis.port,
    config.redis.username,
    config.redis.password,
    config.redis.database
  );
  app.useWebSocketAdapter(redisIoAdapter);
}

await app.listen(port, host);

console.log(`Listening on http://${host}:${port}`);

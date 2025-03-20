import { ModuleMetadata } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Query, Resolver } from '@nestjs/graphql';
import {
  Test,
  TestingModule as BaseTestingModule,
  TestingModuleBuilder,
} from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule, FunctionalityModules } from '../../app.module';
import { AFFiNELogger, Runtime } from '../../base';
import { GqlModule } from '../../base/graphql';
import { AuthGuard, AuthModule } from '../../core/auth';
import { Mailer, MailModule } from '../../core/mail';
import { ModelsModule } from '../../models';
// for jsdoc inference
// oxlint-disable-next-line no-unused-vars
import type { createModule } from '../create-module';
import { createFactory } from '../mocks';
import { MockMailer } from '../mocks/mailer.mock';
import { initTestingDB, TEST_LOG_LEVEL } from './utils';

interface TestingModuleMeatdata extends ModuleMetadata {
  tapModule?(m: TestingModuleBuilder): void;
}

export interface TestingModule extends BaseTestingModule {
  initTestingDB(): Promise<void>;
  create: ReturnType<typeof createFactory>;
  mails: MockMailer;
  [Symbol.asyncDispose](): Promise<void>;
}

function dedupeModules(modules: NonNullable<ModuleMetadata['imports']>) {
  const map = new Map();

  modules.forEach(m => {
    if ('module' in m) {
      map.set(m.module, m);
    } else {
      map.set(m, m);
    }
  });

  return Array.from(map.values());
}

@Resolver(() => String)
class MockResolver {
  @Query(() => String)
  hello() {
    return 'hello world';
  }
}

/**
 * @deprecated use {@link createModule} instead
 */
export async function createTestingModule(
  moduleDef: TestingModuleMeatdata = {},
  autoInitialize = true
): Promise<TestingModule> {
  // setting up
  let imports = moduleDef.imports ?? [AppModule];
  imports =
    imports[0] === AppModule
      ? [AppModule]
      : dedupeModules([
          ...FunctionalityModules,
          ModelsModule,
          AuthModule,
          GqlModule,
          MailModule,
          ...imports,
        ]);

  const builder = Test.createTestingModule({
    imports,
    providers: [
      {
        provide: APP_GUARD,
        useClass: AuthGuard,
      },
      MockResolver,
      ...(moduleDef.providers ?? []),
    ],
    controllers: moduleDef.controllers,
  });

  if (moduleDef.tapModule) {
    moduleDef.tapModule(builder);
  }
  builder.overrideProvider(Mailer).useClass(MockMailer);

  const module = await builder.compile();

  const testingModule = module as TestingModule;

  testingModule.initTestingDB = async () => {
    await initTestingDB(module);

    const runtime = module.get(Runtime);
    // by pass password min length validation
    await runtime.set('auth/password.min', 1);
  };

  testingModule.create = createFactory(
    module.get(PrismaClient, { strict: false })
  );

  testingModule[Symbol.asyncDispose] = async () => {
    await module.close();
  };

  testingModule.mails = module.get(Mailer, { strict: false }) as MockMailer;

  const logger = new AFFiNELogger();
  // we got a lot smoking tests try to break nestjs
  // can't tolerate the noisy logs
  logger.setLogLevels([TEST_LOG_LEVEL]);
  module.useLogger(logger);

  if (autoInitialize) {
    await testingModule.initTestingDB();
    await testingModule.init();
  }
  return testingModule;
}

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { assign, pick } from 'lodash-es';

import { Config, MailService, SignUpForbidden } from '../../base';
import { Models, type User, type UserSession } from '../../models';
import { FeatureManagementService } from '../features/management';
import { QuotaService } from '../quota/service';
import { QuotaType } from '../quota/types';
import { UserService } from '../user/service';
import type { CurrentUser } from './session';

export function sessionUser(
  user: Pick<
    User,
    'id' | 'email' | 'avatarUrl' | 'name' | 'emailVerifiedAt'
  > & { password?: string | null }
): CurrentUser {
  // use pick to avoid unexpected fields
  return assign(pick(user, 'id', 'email', 'avatarUrl', 'name'), {
    hasPassword: user.password !== null,
    emailVerified: user.emailVerifiedAt !== null,
  });
}

function extractTokenFromHeader(authorization: string) {
  if (!/^Bearer\s/i.test(authorization)) {
    return;
  }

  return authorization.substring(7);
}

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  readonly cookieOptions: CookieOptions = {
    sameSite: 'lax',
    httpOnly: true,
    path: '/',
    secure: this.config.server.https,
  };
  static readonly sessionCookieName = 'affine_session';
  static readonly userCookieName = 'affine_user_id';

  constructor(
    private readonly config: Config,
    private readonly models: Models,
    private readonly mailer: MailService,
    private readonly feature: FeatureManagementService,
    private readonly quota: QuotaService,
    private readonly user: UserService
  ) {}

  async onApplicationBootstrap() {
    if (this.config.node.dev) {
      try {
        const [email, name, password] = ['dev@affine.pro', 'Dev User', 'dev'];
        let devUser = await this.user.findUserByEmail(email);
        if (!devUser) {
          devUser = await this.user.createUser_without_verification({
            email,
            name,
            password,
          });
        }
        await this.quota.switchUserQuota(devUser.id, QuotaType.ProPlanV1);
        await this.feature.addAdmin(devUser.id);
        await this.feature.addCopilot(devUser.id);
      } catch {
        // ignore
      }
    }
  }

  canSignIn(email: string) {
    return this.feature.canEarlyAccess(email);
  }

  /**
   * This is a test only helper to quickly signup a user, do not use in production
   */
  async signUp(email: string, password: string): Promise<CurrentUser> {
    if (!this.config.node.test) {
      throw new SignUpForbidden(
        'sign up helper is forbidden for non-test environment'
      );
    }

    return this.user
      .createUser_without_verification({
        email,
        password,
      })
      .then(sessionUser);
  }

  async signIn(email: string, password: string): Promise<CurrentUser> {
    return this.user.signIn(email, password).then(sessionUser);
  }

  async signOut(sessionId: string, userId?: string) {
    // sign out all users in the session
    if (!userId) {
      await this.models.session.deleteSession(sessionId);
    } else {
      await this.models.session.deleteUserSession(userId, sessionId);
    }
  }

  async getUserSession(
    sessionId: string,
    userId?: string
  ): Promise<{ user: CurrentUser; session: UserSession } | null> {
    const sessions = await this.getUserSessions(sessionId);

    if (!sessions.length) {
      return null;
    }

    let userSession: UserSession | undefined;

    // try read from user provided cookies.userId
    if (userId) {
      userSession = sessions.find(s => s.userId === userId);
    }

    // fallback to the first valid session if user provided userId is invalid
    if (!userSession) {
      // checked
      // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion
      userSession = sessions.at(-1)!;
    }

    const user = await this.user.findUserById(userSession.userId);

    if (!user) {
      return null;
    }

    return { user: sessionUser(user), session: userSession };
  }

  async getUserSessions(sessionId: string) {
    return await this.models.session.findUserSessionsBySessionId(sessionId);
  }

  async createUserSession(userId: string, sessionId?: string, ttl?: number) {
    return await this.models.session.createOrRefreshUserSession(
      userId,
      sessionId,
      ttl
    );
  }

  async getUserList(sessionId: string) {
    const sessions = await this.models.session.findUserSessionsBySessionId(
      sessionId,
      {
        user: true,
      }
    );
    return sessions.map(({ user }) => sessionUser(user));
  }

  async createSession() {
    return await this.models.session.createSession();
  }

  async getSession(sessionId: string) {
    return await this.models.session.getSession(sessionId);
  }

  async refreshUserSessionIfNeeded(
    res: Response,
    userSession: UserSession,
    ttr?: number
  ): Promise<boolean> {
    const newExpiresAt = await this.models.session.refreshUserSessionIfNeeded(
      userSession,
      ttr
    );
    if (!newExpiresAt) {
      // no need to refresh
      return false;
    }

    res.cookie(AuthService.sessionCookieName, userSession.sessionId, {
      expires: newExpiresAt,
      ...this.cookieOptions,
    });

    return true;
  }

  async revokeUserSessions(userId: string) {
    return await this.models.session.deleteUserSession(userId);
  }

  getSessionOptionsFromRequest(req: Request) {
    let sessionId: string | undefined =
      req.cookies[AuthService.sessionCookieName];

    if (!sessionId && req.headers.authorization) {
      sessionId = extractTokenFromHeader(req.headers.authorization);
    }

    const userId: string | undefined =
      req.cookies[AuthService.userCookieName] ||
      req.headers[AuthService.userCookieName.replaceAll('_', '-')];

    return {
      sessionId,
      userId,
    };
  }

  async setCookies(req: Request, res: Response, userId: string) {
    const { sessionId } = this.getSessionOptionsFromRequest(req);

    const userSession = await this.createUserSession(userId, sessionId);

    res.cookie(AuthService.sessionCookieName, userSession.sessionId, {
      ...this.cookieOptions,
      expires: userSession.expiresAt ?? void 0,
    });

    this.setUserCookie(res, userId);
  }

  async refreshCookies(res: Response, sessionId?: string) {
    if (sessionId) {
      const users = await this.getUserList(sessionId);
      const candidateUser = users.at(-1);

      if (candidateUser) {
        this.setUserCookie(res, candidateUser.id);
        return;
      }
    }

    this.clearCookies(res);
  }

  private clearCookies(res: Response<any, Record<string, any>>) {
    res.clearCookie(AuthService.sessionCookieName);
    res.clearCookie(AuthService.userCookieName);
  }

  setUserCookie(res: Response, userId: string) {
    res.cookie(AuthService.userCookieName, userId, {
      ...this.cookieOptions,
      // user cookie is client readable & writable for fast user switch if there are multiple users in one session
      // it safe to be non-secure & non-httpOnly because server will validate it by `cookie[AuthService.sessionCookieName]`
      httpOnly: false,
      secure: false,
    });
  }

  async getUserSessionFromRequest(req: Request, res?: Response) {
    const { sessionId, userId } = this.getSessionOptionsFromRequest(req);

    if (!sessionId) {
      return null;
    }

    const session = await this.getUserSession(sessionId, userId);

    if (res) {
      if (session) {
        // set user id cookie for fast authentication
        if (!userId || userId !== session.user.id) {
          this.setUserCookie(res, session.user.id);
        }
      } else if (sessionId) {
        // clear invalid cookies.session and cookies.userId
        this.clearCookies(res);
      }
    }

    return session;
  }

  async changePassword(
    id: string,
    newPassword: string
  ): Promise<Omit<User, 'password'>> {
    return this.user.updateUser(id, { password: newPassword });
  }

  async changeEmail(
    id: string,
    newEmail: string
  ): Promise<Omit<User, 'password'>> {
    return this.user.updateUser(id, {
      email: newEmail,
      emailVerifiedAt: new Date(),
    });
  }

  async setEmailVerified(id: string) {
    return await this.user.updateUser(
      id,
      { emailVerifiedAt: new Date() },
      { emailVerifiedAt: true }
    );
  }

  async sendChangePasswordEmail(email: string, callbackUrl: string) {
    return this.mailer.sendChangePasswordEmail(email, callbackUrl);
  }
  async sendSetPasswordEmail(email: string, callbackUrl: string) {
    return this.mailer.sendSetPasswordEmail(email, callbackUrl);
  }
  async sendChangeEmail(email: string, callbackUrl: string) {
    return this.mailer.sendChangeEmail(email, callbackUrl);
  }
  async sendVerifyChangeEmail(email: string, callbackUrl: string) {
    return this.mailer.sendVerifyChangeEmail(email, callbackUrl);
  }
  async sendVerifyEmail(email: string, callbackUrl: string) {
    return this.mailer.sendVerifyEmail(email, callbackUrl);
  }
  async sendNotificationChangeEmail(email: string) {
    return this.mailer.sendNotificationChangeEmail(email);
  }

  async sendSignInEmail(email: string, link: string, signUp: boolean) {
    return signUp
      ? await this.mailer.sendSignUpMail(link, {
          to: email,
        })
      : await this.mailer.sendSignInMail(link, {
          to: email,
        });
  }
}

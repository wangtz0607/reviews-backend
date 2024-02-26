import express from 'express';
import { Express } from 'express-serve-static-core';
import cors from 'cors';
import compression from 'compression';
import session, { Store } from 'express-session';

import Closeable from './commons/Closeable';

import CaptchaGenerator from './captcha/CaptchaGenerator';
import Database from './database/Database';
import Logger from './logging/Logger';
import Mailer from './mailing/Mailer';
import PasswordEncoder from './security/PasswordEncoder';
import RateLimiter from './rate-limiting/RateLimiter';
import TokenGenerator from './security/TokenGenerator';

import AuthRoute from './routes/AuthRoute';
import CaptchaRoute from './routes/CaptchaRoute';
import ClassesRoute from './routes/ClassesRoute';
import CommentsRoute from './routes/CommentsRoute';
import CommentVotesRoute from './routes/CommentVotesRoute';
import CoursesRoute from './routes/CoursesRoute';
import DepartmentsRoute from './routes/DepartmentsRoute';
import RequestPasswordResetRoute from './routes/RequestPasswordResetRoute';
import ResendEmailRoute from './routes/ResendEmailRoute';
import ResetPasswordRoute from './routes/ResetPasswordRoute';
import ReviewsRoute from './routes/ReviewsRoute';
import ReviewVotesRoute from './routes/ReviewVotesRoute';
import StaffsRoute from './routes/StaffsRoute';
import StatsRoute from './routes/StatsRoute';
import UsersRoute from './routes/UsersRoute';
import VerifyEmailRoute from './routes/VerifyEmailRoute';

class App implements Closeable {
  private readonly app: Express;
  private database: Database;
  private logger: Logger;
  private rateLimiter: RateLimiter;

  public constructor(
    objects: {
      captchaGenerator: CaptchaGenerator,
      database: Database,
      logger: Logger,
      mailer: Mailer,
      passwordEncoder: PasswordEncoder,
      rateLimiter: RateLimiter,
      sessionStore: Store,
      tokenGenerator: TokenGenerator,
    },
    values: {
      corsOrigin: string,
      resetPasswordUrl: string,
      sessionSecret: string,
      trustProxy: boolean,
      verifyEmailUrl: string,
    }
  ) {
    const {
      captchaGenerator,
      database,
      logger,
      mailer,
      passwordEncoder,
      rateLimiter,
      sessionStore,
      tokenGenerator,
    } = objects;
    const {
      corsOrigin,
      resetPasswordUrl,
      sessionSecret,
      trustProxy,
      verifyEmailUrl
    } = values;
    this.database = database;
    this.logger = logger;
    this.rateLimiter = rateLimiter;

    this.app = express();

    this.app.set('trust proxy', trustProxy);

    this.app.use(cors({
      origin: corsOrigin,
      credentials: true
    }));
    this.app.use(compression());
    this.app.use(session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: sessionStore
    }));
    this.app.use(express.json());

    this.app.use(async (request, response, next) => {
      try {
        const myUserId = (request.session as Record<string, any>)?.myUserId;
        if (myUserId !== undefined) {
          const rows = await database.query('SELECT suspended FROM user WHERE id = ?', myUserId);
          let noUser = rows.length === 0;
          if (rows.length > 0) {
            const [{ suspended }] = rows;
            noUser = suspended;
          }
          if (noUser) {
            delete (request.session as Record<string, any>).myUserId;
          }
        }
        next();
      } catch (e) {
        next(e);
      }
    });

    this.app.use('/', new AuthRoute(rateLimiter, database, passwordEncoder).buildRouter());
    this.app.use('/', new CaptchaRoute(rateLimiter, captchaGenerator).buildRouter());
    this.app.use('/', new ClassesRoute(rateLimiter, database).buildRouter());
    this.app.use('/', new CommentsRoute(rateLimiter, database).buildRouter());
    this.app.use('/', new CommentVotesRoute(rateLimiter, database).buildRouter());
    this.app.use('/', new CoursesRoute(rateLimiter, database).buildRouter());
    this.app.use('/', new DepartmentsRoute(rateLimiter, database).buildRouter());
    this.app.use('/', new RequestPasswordResetRoute(rateLimiter, logger, database, tokenGenerator, mailer, resetPasswordUrl).buildRouter());
    this.app.use('/', new ResendEmailRoute(rateLimiter, logger, database, tokenGenerator, mailer, verifyEmailUrl).buildRouter());
    this.app.use('/', new ResetPasswordRoute(rateLimiter, logger, database, passwordEncoder).buildRouter());
    this.app.use('/', new ReviewsRoute(rateLimiter, database).buildRouter());
    this.app.use('/', new ReviewVotesRoute(rateLimiter, database).buildRouter());
    this.app.use('/', new StaffsRoute(rateLimiter, database).buildRouter());
    this.app.use('/', new StatsRoute(rateLimiter, database).buildRouter());
    this.app.use('/', new UsersRoute(rateLimiter, logger, database, passwordEncoder, tokenGenerator, mailer, verifyEmailUrl).buildRouter());
    this.app.use('/', new VerifyEmailRoute(rateLimiter, database).buildRouter());

    this.app.use((req, res) => {
      res.status(404).json({ message: 'No such endpoint' });
    });

    this.app.use((error, req, res, next) => {
      if (res.headersSent) {
        return next(error);
      }
      const statusCode = error?.statusCode ?? 500;
      if (statusCode === 500) {
        logger.error(error.stack);
      }
      res.status(statusCode).end();
    });
  }

  public async close(): Promise<void> {
    await this.database.close();
    await this.logger.close();
    await this.rateLimiter.close();
  }

  public express(): Express {
    return this.app;
  }
}

export default App;

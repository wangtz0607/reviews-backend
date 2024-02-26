import * as dotenv from 'dotenv';
import mysql from 'mysql2';
import nodemailer from 'nodemailer';
import Redis from 'ioredis';
import RedisStore from 'connect-redis';
import session from 'express-session';
import winston from 'winston';

import App from './App';

import BCryptPasswordEncoder from './security/BCryptPasswordEncoder';
import CamelCaseKeyRowMapper from './database/CamelCaseKeyRowMapper';
import DefaultCaptchaGenerator from './captcha/DefaultCaptchaGenerator';
import DefaultLogger from './logging/DefaultLogger';
import DefaultTokenGenerator from './security/DefaultTokenGenerator';
import FixedWindowRateLimiter, { FixedWindowLimit } from './rate-limiting/FixedWindowRateLimiter';
import MemoryCache from './caching/MemoryCache';
import MySQLDatabase from './database/MySQLDatabase';
import NopMailer from './mailing/NopMailer';
import RedisCache from './caching/RedisCache';
import SmtpMailer from './mailing/SmtpMailer';

dotenv.config();
process.env.NODE_ENV = process.env.NODE_ENV ?? 'development';
if (!['development', 'test', 'production'].includes(process.env.NODE_ENV)) {
  throw new Error('NODE_ENV');
}
process.env.SESSION_STORE = process.env.SESSION_STORE ?? (process.env.NODE_ENV === 'production' ? 'RedisStore' : 'MemoryStore');
if (!['RedisStore', 'MemoryStore'].includes(process.env.SESSION_STORE)) {
  throw new Error('SESSION_STORE');
}
process.env.CACHE = process.env.CACHE ?? (process.env.NODE_ENV === 'production' ? 'RedisCache' : 'MemoryCache');
if (!['RedisCache', 'MemoryCache'].includes(process.env.CACHE)) {
  throw new Error('CACHE');
}
process.env.MAILER = process.env.MAILER ?? (process.env.NODE_ENV === 'production' ? 'SmtpMailer' : 'NopMailer');
if (!['SmtpMailer', 'NopMailer'].includes(process.env.MAILER)) {
  throw new Error('MAILER');
}

const logger = new DefaultLogger(winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
}));

let redisClient;
if (process.env.SESSION_STORE === 'RedisStore' || process.env.CACHE === 'RedisCache') {
  redisClient = new Redis({
    host: process.env.REDIS_HOST!,
    port: +process.env.REDIS_PORT!
  });
}

let sessionStore;
switch (process.env.SESSION_STORE) {
case 'RedisStore':
  sessionStore = new (RedisStore(session))({ client: redisClient });
  break;
case 'MemoryStore':
  sessionStore = new session.MemoryStore();
  break;
}

let cache;
switch (process.env.CACHE) {
case 'RedisCache':
  cache = new RedisCache(redisClient);
  break;
case 'MemoryCache':
  cache = new MemoryCache();
  break;
}

const rateLimiter = new FixedWindowRateLimiter(cache);
rateLimiter.setLimit('default', new FixedWindowLimit(60, 100));
rateLimiter.setLimit('checkCredentials', new FixedWindowLimit(300, 10));
rateLimiter.setLimit('createUser', new FixedWindowLimit(3600, 3));
rateLimiter.setLimit('createReview', new FixedWindowLimit(1200, 4));
rateLimiter.setLimit('createComment', new FixedWindowLimit(240, 4));
rateLimiter.setLimit('sendMail', new FixedWindowLimit(3600, 3));

const promisePool = mysql.createPool({
  host: process.env.MYSQL_HOST!,
  port: +process.env.MYSQL_PORT!,
  user: process.env.MYSQL_USER!,
  password: process.env.MYSQL_PASSWORD!,
  database: process.env.MYSQL_DATABASE!
}).promise();

const database = new MySQLDatabase(promisePool);
database.setRowMapper(new CamelCaseKeyRowMapper());

let mailer;
if (process.env.MAILER === 'NopMailer') {
  mailer = new NopMailer(logger);
} else {
  mailer = new SmtpMailer(
    logger,
    nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: +process.env.SMTP_PORT!,
      secure: !!process.env.SMTP_SECURE!,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!
      }
    }),
    process.env.MAIL_FROM!
  );
}

const captchaGenerator = new DefaultCaptchaGenerator();
const passwordEncoder = new BCryptPasswordEncoder(+process.env.BCRYPT_ROUNDS!);
const tokenGenerator = new DefaultTokenGenerator(+process.env.TOKEN_SIZE!);

const app = new App(
  {
    captchaGenerator,
    database,
    logger,
    mailer,
    passwordEncoder,
    rateLimiter,
    sessionStore,
    tokenGenerator,
  },
  {
    corsOrigin: process.env.FRONTEND!,
    resetPasswordUrl: `${process.env.FRONTEND!}${process.env.RESET_PASSWORD_PATH!}`,
    sessionSecret: process.env.SESSION_SECRET!,
    trustProxy: !!process.env.TRUST_PROXY!,
    verifyEmailUrl: `${process.env.FRONTEND!}${process.env.VERIFY_EMAIL_PATH!}`
  }
);

if (require.main === module) {
  app.express().listen(+process.env.BIND_PORT!, process.env.BIND_HOST!);
}

export { captchaGenerator, database, logger, mailer, passwordEncoder, rateLimiter, sessionStore, tokenGenerator };
export default app;

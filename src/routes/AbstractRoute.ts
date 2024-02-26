import { Router } from 'express';
import Route from './Route';
import { applyHandler } from '../commons/helpers';

type Method = 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

class ErrorResponse extends Error {
  public name = 'ErrorResponse';
  public statusCode: number;

  public constructor(statusCode: number, message?: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

abstract class AbstractRoute implements Route {
  private router: Router = Router();

  protected add(method: Method, path: string, handler: (request: Record<string, any>, response: Record<string, any>) => Promise<void>): void {
    switch (method) {
    case 'ALL':
      this.all(path, handler);
      break;
    case 'GET':
      this.get(path, handler);
      break;
    case 'POST':
      this.post(path, handler);
      break;
    case 'PUT':
      this.put(path, handler);
      break;
    case 'DELETE':
      this.delete(path, handler);
      break;
    case 'PATCH':
      this.patch(path, handler);
      break;
    case 'OPTIONS':
      this.options(path, handler);
      break;
    case 'HEAD':
      this.head(path, handler);
    }
  }

  private all(path: string, handler: (request: Record<string, any>, response: Record<string, any>) => Promise<void>): void {
    this.router.all(path, async (request, response, next) => {
      await applyHandler(handler, request, response, next);
    });
  }

  private get(path: string, handler: (request: Record<string, any>, response: Record<string, any>) => Promise<void>): void {
    this.router.get(path, async (request, response, next) => {
      await applyHandler(handler, request, response, next);
    });
  }

  private post(path: string, handler: (request: Record<string, any>, response: Record<string, any>) => Promise<void>): void {
    this.router.post(path, async (request, response, next) => {
      await applyHandler(handler, request, response, next);
    });
  }

  private put(path: string, handler: (request: Record<string, any>, response: Record<string, any>) => Promise<void>): void {
    this.router.put(path, async (request, response, next) => {
      await applyHandler(handler, request, response, next);
    });
  }

  private delete(path: string, handler: (request: Record<string, any>, response: Record<string, any>) => Promise<void>): void {
    this.router.delete(path, async (request, response, next) => {
      await applyHandler(handler, request, response, next);
    });
  }

  private patch(path: string, handler: (request: Record<string, any>, response: Record<string, any>) => Promise<void>): void {
    this.router.patch(path, async (request, response, next) => {
      await applyHandler(handler, request, response, next);
    });
  }

  private options(path: string, handler: (request: Record<string, any>, response: Record<string, any>) => Promise<void>): void {
    this.router.options(path, async (request, response, next) => {
      await applyHandler(handler, request, response, next);
    });
  }

  private head(path: string, handler: (request: Record<string, any>, response: Record<string, any>) => Promise<void>): void {
    this.router.head(path, async (request, response, next) => {
      await applyHandler(handler, request, response, next);
    });
  }

  public buildRouter(): Router {
    return this.router;
  }
}

export { Method, ErrorResponse };
export default AbstractRoute;

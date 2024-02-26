import { Router } from 'express';

interface Route {
  buildRouter(): Router;
}

export default Route;

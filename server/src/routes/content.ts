/**
 * Read-only content routes: list facilities and roles for the selection screens.
 * No parameters, no state — safe to serve directly.
 */
import { Router } from 'express';
import { FACILITIES } from '../content/facilities.js';
import { ROLES } from '../content/roles.js';

export const contentRouter = Router();

contentRouter.get('/facilities', (_req, res) => {
  res.json({ facilities: Object.values(FACILITIES) });
});

contentRouter.get('/roles', (_req, res) => {
  res.json({ roles: Object.values(ROLES) });
});

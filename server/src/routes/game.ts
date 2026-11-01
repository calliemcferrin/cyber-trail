/**
 * Game API routes. Thin handlers: validate input, call the engine, return the
 * authoritative view. No game logic lives here.
 */
import { Router } from 'express';
import { z } from 'zod';
import { ChooseRequest, StartGameRequest } from '@cyber-trail/shared';
import { engine } from '../game/engine.js';
import { validateBody, validateParam } from '../middleware/validate.js';

export const gameRouter = Router();

/** Session ids are UUIDs — validate the shape before any lookup. */
const SessionId = z.string().uuid();

gameRouter.post('/start', validateBody(StartGameRequest), (req, res) => {
  const view = engine.startGame(req.body);
  res.status(201).json(view);
});

gameRouter.get(
  '/:sessionId',
  validateParam('sessionId', SessionId),
  (req, res) => {
    const view = engine.getView(req.params.sessionId as string);
    res.json(view);
  },
);

gameRouter.post(
  '/:sessionId/choose',
  validateParam('sessionId', SessionId),
  validateBody(ChooseRequest),
  (req, res) => {
    const view = engine.choose(req.params.sessionId as string, req.body);
    res.json(view);
  },
);

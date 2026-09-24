import { Router, type Request, type Response, type NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { JoinSessionRequestSchema, MAX_PLAYERS } from '@clocktower/shared';
import type { SessionStore } from '../session/store.js';
import { signPlayerToken, signStorytellerToken } from '../session/tokens.js';
import { Errors } from '../errors.js';

type Handler = (req: Request, res: Response, next: NextFunction) => void;

/** Wraps a synchronous handler so thrown ClocktowerErrors reach the error middleware. */
function safe(handler: Handler): Handler {
  return (req, res, next) => {
    try {
      handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

export function createApiRouter(store: SessionStore): Router {
  const router = Router();

  router.post(
    '/sessions',
    safe((_req, res) => {
      const session = store.createSession('placeholder');
      const storytellerToken = signStorytellerToken(session.code);
      session.storytellerToken = storytellerToken;
      res.status(201).json({ code: session.code, storytellerToken });
    })
  );

  router.get(
    '/sessions/:code',
    safe((req, res) => {
      const code = req.params.code;
      const session = code ? store.getSession(code) : undefined;
      if (!session) {
        throw Errors.invalidJoinCode();
      }
      res.json({
        code: session.code,
        phase: session.phase,
        playerCount: session.players.size,
        maxPlayers: MAX_PLAYERS,
      });
    })
  );

  router.post(
    '/sessions/:code/join',
    safe((req, res) => {
      const code = req.params.code;
      const session = code ? store.getSession(code) : undefined;
      if (!session) {
        throw Errors.invalidJoinCode();
      }
      if (session.phase !== 'lobby') {
        throw Errors.lobbyClosed();
      }
      const parseResult = JoinSessionRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw Errors.validationFailed('Please enter a valid display name.');
      }
      const { displayName } = parseResult.data;

      if (session.players.size >= MAX_PLAYERS) {
        throw Errors.sessionFull();
      }
      if (store.isDisplayNameTaken(session, displayName)) {
        throw Errors.nameTaken();
      }

      const playerId = nanoid(12);
      store.addPlayer(session, playerId, displayName);
      store.touch(session);
      const playerToken = signPlayerToken(session.code, playerId);
      res.status(201).json({ playerId, playerToken, code: session.code });
    })
  );

  return router;
}

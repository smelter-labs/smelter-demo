import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { WebSocket, WebSocketServer } from 'ws';
import mp4SuggestionsMonitor from '../mp4/mp4SuggestionMonitor';
import shadersController from '../shaders/shaders';
import { filterSmelterEvent, handleSmelterRequest, PlaygroundRequestError } from './proxy';
import type { PlaygroundSession } from './sessions';
import {
  PlaygroundSessionLimitError,
  playgroundSessions,
  WHIP_INPUT_KINDS,
} from './sessions';
import { SMELTER_WS_URL, SmelterApiError } from './smelterApi';

// Local development only for now: the website dev server runs on localhost.
const ALLOWED_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const PREFIX = '/playground';
const WS_ROUTE = /^\/playground\/session\/([0-9a-f]+)\/smelter\/ws\/?$/;

type SessionParams = { Params: { sessionId: string } };
type SmelterProxyParams = { Params: { sessionId: string; '*': string } };

/**
 * Playground API used by smelter.dev/playground. Registered under `/playground`, independent
 * of the demo room API. The `smelter/*` routes are a filtering proxy to the shared Smelter
 * instance that `@swmansion/smelter-web-client` running in the browser talks to.
 */
export async function playgroundRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req, res) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGIN.test(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Vary', 'Origin');
    }
  });

  app.options('/*', async (_req, res) => {
    res.status(204).send();
  });

  app.get('/assets', async (_req, res) => {
    res.status(200).send({
      mp4s: mp4SuggestionsMonitor.mp4Files,
      shaders: shadersController.shaders
        .filter(shader => shader.isVisible)
        .map(shader => ({ id: shader.id, name: shader.name, shaderFile: shader.shaderFile })),
    });
  });

  app.post('/session', async (_req, res) => {
    try {
      const session = playgroundSessions.create();
      res.status(200).send({
        sessionId: session.id,
        smelterPath: `${PREFIX}/session/${session.id}/smelter`,
        whepUrl: session.whepUrl(),
        // Endpoints of the WHIP inputs that the playground code registers as "camera"/"screen".
        whipUrls: Object.fromEntries(WHIP_INPUT_KINDS.map(kind => [kind, session.whipUrl(kind)])),
      });
    } catch (err) {
      if (err instanceof PlaygroundSessionLimitError) {
        return res.status(503).send({ error: err.message });
      }
      throw err;
    }
  });

  app.post<SessionParams>('/session/:sessionId/heartbeat', async (req, res) => {
    const session = getSession(req.params.sessionId, res);
    if (!session) return;
    session.lastHeartbeat = Date.now();
    res.status(200).send({ status: 'ok' });
  });

  app.delete<SessionParams>('/session/:sessionId', async (req, res) => {
    await playgroundSessions.remove(req.params.sessionId);
    res.status(200).send({ status: 'ok' });
  });

  app.route<SmelterProxyParams>({
    method: ['GET', 'POST'],
    url: '/session/:sessionId/smelter/*',
    bodyLimit: 256 * 1024,
    handler: async (req, res) => {
      const session = getSession(req.params.sessionId, res);
      if (!session) return;
      try {
        const response = await handleSmelterRequest(
          session,
          req.method,
          req.params['*'].replace(/\/$/, ''),
          req.body
        );
        res.status(200).send(response);
      } catch (err) {
        sendError(res, err, session);
      }
    },
  });

  const wss = new WebSocketServer({ noServer: true });
  app.server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const sessionId = req.url?.match(WS_ROUTE)?.[1];
    if (!sessionId) {
      // Not a playground route; other upgrade handlers (if any) take care of it.
      return;
    }
    const session = playgroundSessions.get(sessionId);
    const origin = req.headers.origin;
    if (!session || (origin && !ALLOWED_ORIGIN.test(origin))) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, client => forwardEvents(session, client));
  });
}

function forwardEvents(session: PlaygroundSession, client: WebSocket) {
  session.sockets.add(client);
  const upstream = new WebSocket(SMELTER_WS_URL);
  upstream.on('message', data => {
    let event: unknown;
    try {
      event = JSON.parse(data.toString());
    } catch {
      return;
    }
    const filtered = filterSmelterEvent(session, event);
    if (filtered && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(filtered));
    }
  });
  const close = () => {
    session.sockets.delete(client);
    client.close();
    upstream.close();
  };
  upstream.on('close', close);
  upstream.on('error', close);
  client.on('close', close);
  client.on('error', close);
}

function getSession(sessionId: string, res: FastifyReply): PlaygroundSession | undefined {
  const session = playgroundSessions.get(sessionId);
  if (!session) {
    res.status(404).send({ error: 'Playground session not found or expired.' });
  }
  return session;
}

function sendError(res: FastifyReply, err: unknown, session?: PlaygroundSession) {
  if (err instanceof PlaygroundRequestError) {
    return res.status(err.status).send(err.toBody());
  }
  if (err instanceof SmelterApiError) {
    return res.status(err.status).send(session ? session.stripPrefix(err.body) : err.body);
  }
  throw err;
}

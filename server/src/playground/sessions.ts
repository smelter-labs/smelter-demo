import { randomBytes } from 'node:crypto';
import type { WebSocket } from 'ws';
import { config } from '../config';
import type { ResourceKind } from './smelterApi';
import { unregisterResource } from './smelterApi';

export const MAX_SESSIONS = 3;
const HEARTBEAT_TIMEOUT_MS = 30_000;
const MAX_SESSION_LIFETIME_MS = 15 * 60_000;

// Output id the playground harness registers; the only output a session may own.
export const PREVIEW_OUTPUT_ID = 'preview';
// The only ids WHIP server inputs can be registered with; the page publishes
// the user's camera/screen share to them.
export const WHIP_INPUT_KINDS = ['camera', 'screen'] as const;
export type WhipInputKind = (typeof WHIP_INPUT_KINDS)[number];

export class PlaygroundSession {
  public readonly id: string;
  public readonly prefix: string;
  public readonly createdAt = Date.now();
  public lastHeartbeat = Date.now();
  public readonly sockets = new Set<WebSocket>();

  // Raw (prefixed) ids of resources registered through the proxy.
  public readonly resources: Record<ResourceKind, Set<string>> = {
    input: new Set(),
    output: new Set(),
    image: new Set(),
    shader: new Set(),
  };

  constructor() {
    this.id = randomBytes(12).toString('hex');
    this.prefix = `pg-${this.id.slice(0, 8)}-`;
  }

  public rawId(id: string): string {
    return `${this.prefix}${id}`;
  }

  public ownsRawId(rawId: string): boolean {
    return rawId.startsWith(this.prefix);
  }

  public stripPrefix<T>(value: T): T {
    return JSON.parse(JSON.stringify(value).split(this.prefix).join(''));
  }

  public whepUrl(): string {
    return `${config.whepBaseUrl}/${encodeURIComponent(this.rawId(PREVIEW_OUTPUT_ID))}`;
  }

  public whipUrl(kind: WhipInputKind): string {
    return `${config.whipBaseUrl}/${encodeURIComponent(this.rawId(kind))}`;
  }

  /**
   * Equivalent of Smelter's `/api/reset`, limited to resources registered by this session.
   */
  public async resetResources(): Promise<void> {
    // Outputs first, so nothing references inputs/renderers while they are removed.
    for (const kind of ['output', 'input', 'image', 'shader'] as const) {
      const ids = [...this.resources[kind]];
      this.resources[kind].clear();
      for (const rawId of ids) {
        await unregisterResource(kind, rawId);
      }
    }
  }

  public async destroy(): Promise<void> {
    for (const socket of this.sockets) {
      socket.close();
    }
    await this.resetResources();
  }
}

export class PlaygroundSessionLimitError extends Error {}

class PlaygroundSessions {
  private sessions = new Map<string, PlaygroundSession>();

  constructor() {
    setInterval(() => void this.removeExpired(), 5_000);
  }

  public create(): PlaygroundSession {
    if (this.sessions.size >= MAX_SESSIONS) {
      throw new PlaygroundSessionLimitError('Too many active playground sessions.');
    }
    const session = new PlaygroundSession();
    this.sessions.set(session.id, session);
    console.log('[playground] Session created', { sessionId: session.id });
    return session;
  }

  public get(sessionId: string): PlaygroundSession | undefined {
    return this.sessions.get(sessionId);
  }

  public async remove(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    this.sessions.delete(sessionId);
    console.log('[playground] Session removed', { sessionId });
    await session.destroy();
  }

  private async removeExpired() {
    const now = Date.now();
    for (const session of [...this.sessions.values()]) {
      const inactive = now - session.lastHeartbeat > HEARTBEAT_TIMEOUT_MS;
      const tooOld = now - session.createdAt > MAX_SESSION_LIFETIME_MS;
      if (inactive || tooOld) {
        await this.remove(session.id).catch(err =>
          console.warn('[playground] Failed to remove session', err)
        );
      }
    }
  }
}

export const playgroundSessions = new PlaygroundSessions();

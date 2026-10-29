import path from 'node:path';
import type { Outputs } from '@swmansion/smelter';
import { config } from '../config';
import mp4SuggestionsMonitor from '../mp4/mp4SuggestionMonitor';
import type { PlaygroundSession, WhipInputKind } from './sessions';
import { PREVIEW_OUTPUT_ID, WHIP_INPUT_KINDS } from './sessions';
import type { ResourceKind } from './smelterApi';
import { smelterRequest } from './smelterApi';

const MAX_RESOURCES: Record<ResourceKind, number> = { input: 8, output: 1, image: 16, shader: 8 };
const MAX_SHADER_SOURCE_LENGTH = 64 * 1024;
const OUTPUT_RESOLUTION = { width: 1280, height: 720 };
// Keys in Smelter HTTP API payloads (scene updates, audio mixes) that reference other resources.
const ID_KEYS = new Set(['input_id', 'image_id', 'shader_id', 'instance_id']);

export class PlaygroundRequestError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }

  public toBody() {
    return { error_code: 'PLAYGROUND_REQUEST_REJECTED', message: this.message };
  }
}

/**
 * Handles a Smelter HTTP API request sent by `@swmansion/smelter-web-client` on behalf of a
 * playground session. Requests are validated, all resource ids are namespaced with the session
 * prefix, and responses have the prefix stripped, so user code sees only its own ids.
 */
export async function handleSmelterRequest(
  session: PlaygroundSession,
  method: string,
  route: string,
  body: unknown
): Promise<unknown> {
  if (method === 'GET' && route === 'status') {
    return await handleStatus(session);
  }
  if (method !== 'POST') {
    throw new PlaygroundRequestError(405, `${method} /${route} is not supported.`);
  }
  if (route === 'api/reset') {
    await session.resetResources();
    return {};
  }
  if (route === 'api/start') {
    // The shared instance is already running.
    return {};
  }

  const match = route.match(/^api\/(input|output|image|shader)\/([^/]+)\/(register|unregister|update)$/);
  if (!match) {
    throw new PlaygroundRequestError(403, `/${route} is not available in the playground.`);
  }
  const kind = match[1] as ResourceKind;
  const id = decodeURIComponent(match[2]);
  const action = match[3];
  const rawId = session.rawId(id);

  const upstreamRoute = `/api/${kind}/${encodeURIComponent(rawId)}/${action}`;
  if (action === 'register') {
    const request = sanitizeRegisterRequest(session, kind, id, body);
    const resources = session.resources[kind];
    if (!resources.has(rawId) && resources.size >= MAX_RESOURCES[kind]) {
      throw new PlaygroundRequestError(429, `Too many ${kind}s registered in this session.`);
    }
    const response = await smelterRequest('POST', upstreamRoute, request);
    resources.add(rawId);
    return session.stripPrefix(response);
  } else if (action === 'unregister') {
    const response = await smelterRequest('POST', upstreamRoute, body ?? {});
    session.resources[kind].delete(rawId);
    return session.stripPrefix(response);
  } else if (action === 'update' && (kind === 'input' || kind === 'output')) {
    const response = await smelterRequest('POST', upstreamRoute, prefixIds(session, body ?? {}));
    return session.stripPrefix(response);
  }
  throw new PlaygroundRequestError(403, `/${route} is not available in the playground.`);
}

async function handleStatus(session: PlaygroundSession) {
  const status = await smelterRequest('GET', '/status');
  return session.stripPrefix({
    ...status,
    inputs: (status.inputs ?? []).filter((i: any) => session.ownsRawId(i.input_id)),
    outputs: (status.outputs ?? []).filter((o: any) => session.ownsRawId(o.output_id)),
  });
}

/**
 * Filters Smelter WebSocket events to resources registered by this session.
 * Returns null if the event should not be forwarded.
 */
export function filterSmelterEvent(session: PlaygroundSession, event: any): unknown | null {
  const isOwned =
    (typeof event?.input_id === 'string' && session.resources.input.has(event.input_id)) ||
    (typeof event?.output_id === 'string' && session.resources.output.has(event.output_id));
  return isOwned ? session.stripPrefix(event) : null;
}

function sanitizeRegisterRequest(
  session: PlaygroundSession,
  kind: ResourceKind,
  id: string,
  body: any
): object {
  switch (kind) {
    case 'input':
      return sanitizeInput(id, body);
    case 'output':
      return sanitizeOutput(session, id, body);
    case 'image':
      return sanitizeImage(body);
    case 'shader':
      return sanitizeShader(body);
  }
}

function sanitizeInput(id: string, body: any): object {
  const isWhipId = WHIP_INPUT_KINDS.includes(id as WhipInputKind);
  if (body?.type === 'whip_server') {
    if (!isWhipId) {
      throw new PlaygroundRequestError(
        403,
        `WHIP inputs can only be registered as ${WHIP_INPUT_KINDS.map(kind => `"${kind}"`).join(' or ')}.`
      );
    }
    return { type: 'whip_server', video: { decoder_preferences: [config.h264Decoder] } };
  }
  if (isWhipId) {
    throw new PlaygroundRequestError(
      403,
      `Input id "${id}" is reserved for the playground camera/screen share.`
    );
  }
  if (body?.type !== 'mp4') {
    throw new PlaygroundRequestError(
      403,
      `Input type "${body?.type}" is not available in the playground. Use an MP4 input with one of the demo files.`
    );
  }
  const source = body.path ?? body.url;
  const fileName = typeof source === 'string' ? path.basename(source) : undefined;
  if (!fileName || !mp4SuggestionsMonitor.mp4Files.includes(fileName)) {
    throw new PlaygroundRequestError(
      403,
      `MP4 source "${source}" is not available. Use one of: ${mp4SuggestionsMonitor.mp4Files.join(', ')}.`
    );
  }
  return {
    type: 'mp4',
    path: path.resolve(process.cwd(), 'mp4s', fileName),
    loop: body.loop,
    required: body.required,
    offset_ms: body.offset_ms,
    seek_ms: body.seek_ms,
    decoder_map: { h264: config.h264Decoder },
  };
}

function sanitizeOutput(session: PlaygroundSession, id: string, body: any): object {
  if (id !== PREVIEW_OUTPUT_ID) {
    throw new PlaygroundRequestError(
      403,
      `Only the "${PREVIEW_OUTPUT_ID}" output can be registered in the playground.`
    );
  }
  if (body?.type !== 'whep_server') {
    throw new PlaygroundRequestError(403, 'Only WHEP server outputs are available.');
  }
  return {
    type: 'whep_server',
    video: body.video?.initial && {
      resolution: OUTPUT_RESOLUTION,
      encoder: rawWhepVideoEncoder(config.h264Encoder),
      initial: prefixIds(session, body.video.initial),
    },
    audio: body.audio?.initial && {
      encoder: { type: 'opus' },
      initial: prefixIds(session, body.audio.initial),
    },
  };
}

function sanitizeImage(body: any): object {
  const url = body?.url;
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    throw new PlaygroundRequestError(403, 'Images can only be registered from an http(s) URL.');
  }
  return { asset_type: body.asset_type, url, resolution: body.resolution };
}

function sanitizeShader(body: any): object {
  const source = body?.source;
  if (typeof source !== 'string' || source.length > MAX_SHADER_SOURCE_LENGTH) {
    throw new PlaygroundRequestError(
      403,
      `Shader source must be a string of at most ${MAX_SHADER_SOURCE_LENGTH} characters.`
    );
  }
  return { source };
}

function prefixIds(session: PlaygroundSession, value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => prefixIds(session, item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        ID_KEYS.has(key) && typeof item === 'string' ? session.rawId(item) : prefixIds(session, item),
      ])
    );
  }
  return value;
}

// `config.h264Encoder` uses the SDK shape, the proxy talks to the raw HTTP API.
function rawWhepVideoEncoder(encoder: Outputs.WhepVideoEncoderOptions): object {
  switch (encoder.type) {
    case 'vulkan_h264':
      return {
        type: 'vulkan_h264',
        bitrate: encoder.bitrate,
        keyframe_interval_ms: encoder.keyframeIntervalMs,
      };
    case 'ffmpeg_h264':
      return {
        type: 'ffmpeg_h264',
        bitrate: encoder.bitrate,
        keyframe_interval_ms: encoder.keyframeIntervalMs,
        preset: encoder.preset,
        pixel_format: encoder.pixelFormat,
        ffmpeg_options: encoder.ffmpegOptions,
      };
    default:
      throw new Error(`Unsupported playground encoder ${encoder.type}`);
  }
}

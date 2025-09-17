'use server';

import type { SpawnOptions } from 'node:child_process';
import { spawn as nodeSpawn } from 'node:child_process';
import { assert } from 'node:console';

export type Input = {
  id: number;
  inputId: string;
  title: string;
  description: string;
  volume: number;
  type?: string;
  sourceState: 'live' | 'offline' | 'unknown' | 'always-live';
  status: 'disconnected' | 'pending' | 'connected';

  // only set if this is input from twitch
  twitchChannelId?: string;
};

export type RoomState = {
  inputs: Input[];
  layout: Layout;
  whepUrl: string;
  pendingDelete?: boolean;
};

export type Layout =
  | 'grid'
  | 'primary-on-left'
  | 'primary-on-top'
  | 'secondary-in-corner';

export interface TwitchChannelSuggestion {
  streamId: string;
  displayName: string;
  title: string;
  category: string;
}

export type InputSuggestions = {
  twitch: TwitchChannelSuggestion[];
};
export type MP4Suggestions = {
  mp4s: string[];
};

export async function createNewRoom(): Promise<{
  roomId: string;
  whepUrl: string;
}> {
  return await sendSmelterRequest('post', '/room', {});
}

export type UpdateRoomOptions = {
  inputOrder?: string[];
  layout?: Layout;
};

export async function updateRoom(
  roomId: string,
  opts: UpdateRoomOptions,
): Promise<{
  roomId: string;
  whepUrl: string;
}> {
  return await sendSmelterRequest(
    'post',
    `/room/${encodeURIComponent(roomId)}`,
    opts,
  );
}

export async function getRoomInfo(
  roomId: string,
): Promise<RoomState | 'not-found'> {
  try {
    return await sendSmelterRequest(
      'get',
      `/room/${encodeURIComponent(roomId)}`,
    );
  } catch (err: any) {
    if (err.status === 404) {
      return 'not-found';
    }
    throw err;
  }
}

export async function getInputSuggestions(): Promise<InputSuggestions> {
  return await sendSmelterRequest('get', `/suggestions`);
}

export async function getMP4Suggestions(): Promise<MP4Suggestions> {
  return await sendSmelterRequest('get', `/resources/mp4s`);
}

export async function addInput(roomId: string, twitchChannelId: string) {
  return await sendSmelterRequest(
    'post',
    `/room/${encodeURIComponent(roomId)}/input`,
    {
      type: 'twitch-channel',
      twitchChannelId,
    },
  );
}

export async function removeInput(roomId: string, inputId: string) {
  return await sendSmelterRequest(
    'delete',
    `/room/${encodeURIComponent(roomId)}/input/${encodeURIComponent(inputId)}`,
    {},
  );
}

export async function addMP4Input(roomId: string, mp4Url: string) {
  return await sendSmelterRequest(
    'post',
    `/room/${encodeURIComponent(roomId)}/input`,
    { type: 'local-mp4', mp4Url },
  );
}

export type UpdateInputOptions = {
  volume: number;
};

export async function updateInput(
  roomId: string,
  inputId: string,
  opts: Partial<UpdateInputOptions>,
) {
  return await sendSmelterRequest(
    'post',
    `/room/${encodeURIComponent(roomId)}/input/${encodeURIComponent(inputId)}`,
    opts,
  );
}

export async function disconnectInput(roomId: string, inputId: string) {
  return await sendSmelterRequest(
    'post',
    `/room/${encodeURIComponent(roomId)}/input/${encodeURIComponent(inputId)}/disconnect`,
    {},
  );
}

export async function connectInput(roomId: string, inputId: string) {
  return await sendSmelterRequest(
    'post',
    `/room/${encodeURIComponent(roomId)}/input/${encodeURIComponent(inputId)}/connect`,
    {},
  );
}

export async function restartService(): Promise<void> {
  try {
    await spawn('bash', ['-c', 'sudo systemctl restart smelter.service'], {});
  } catch {}
  await new Promise<void>((res) => {
    setTimeout(() => res(), 5000);
  });
}

const BASE_URL = process.env.SMELTER_DEMO_SERVER_URL;
assert(BASE_URL);

async function sendSmelterRequest(
  method: 'get' | 'delete' | 'post',
  route: string,
  body?: object,
): Promise<any> {
  const response = await fetch(`${BASE_URL}${route}`, {
    method,
    body: body && JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.status >= 400) {
    const err = new Error(`Request to Smelter server failed.`) as any;
    err.response = response;
    err.body = await response.text();
    try {
      err.body = JSON.parse(err.body);
      err.status = response.status;
    } catch (err) {
      console.error('Failed to parse response');
    }
    throw err;
  }
  return (await response.json()) as object;
}

function spawn(
  command: string,
  args: string[],
  options: SpawnOptions,
): Promise<void> {
  console.log('spawn', command, args);
  const child = nodeSpawn(command, args, {
    stdio: 'inherit',
    ...options,
  });
  return new Promise<void>((res, rej) => {
    child.on('error', (err) => {
      rej(err);
    });
    child.on('exit', (code) => {
      if (code === 0) {
        res();
      } else {
        rej(new Error(`Exit with exit code ${code}`));
      }
    });
  });
}

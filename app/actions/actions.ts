'use server';

import type { SpawnOptions } from 'node:child_process';
import { spawn as nodeSpawn } from 'node:child_process';
import { assert } from 'node:console';

//let BASE_URL = process.env.SMELTER_DEMO_SERVER_URL;
const BASE_URL = 'https://puffer.fishjam.io/smelter-demo-api';
const WHIP_URL = 'https://puffer.fishjam.io/smelter-demo-whep';
//WHIP_URL = 'http://localhost:9000';
//BASE_URL = 'http://localhost:3001';
assert(BASE_URL);

type ShaderParam = {
  name: string;
  type: string;
  minValue?: number;
  maxValue?: number;
  defaultValue?: number;
};

export type AvailableShader = {
  id: string;
  name: string;
  description: string;
  shaderFile: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  params: ShaderParam[];
};

export type ShaderParamConfig = {
  paramName: string;
  paramValue: number;
};

export type ShaderConfig = {
  shaderName: string;
  shaderId: string;
  enabled: boolean;
  params: ShaderParamConfig[];
};

export type Input = {
  id: number;
  inputId: string;
  title: string;
  description: string;
  volume: number;
  type?: string;
  sourceState: 'live' | 'offline' | 'unknown' | 'always-live';
  status: 'disconnected' | 'pending' | 'connected';
  channelId?: string;
  shaders: ShaderConfig[];
};

export type RegisterInputOptions =
  | {
      type: 'twitch-channel';
      channelId: string;
    }
  | {
      type: 'kick-channel';
      channelId: string;
    }
  | {
      type: 'local-mp4';
      source: {
        fileName?: string;
        url?: string;
      };
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

export interface ChannelSuggestion {
  streamId: string;
  displayName: string;
  title: string;
  category: string;
}

export type InputSuggestions = {
  twitch: ChannelSuggestion[];
};

export type KickSuggestions = {
  kick: ChannelSuggestion[];
};

export type MP4Suggestions = {
  mp4s: string[];
};

export async function createNewRoom(
  initInputs: RegisterInputOptions[],
): Promise<{
  roomId: string;
  whepUrl: string;
}> {
  return await sendSmelterRequest('post', '/room', { initInputs });
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

export async function getTwitchSuggestions(): Promise<InputSuggestions> {
  return await sendSmelterRequest('get', `/suggestions/twitch`);
}

export async function getMP4Suggestions(): Promise<MP4Suggestions> {
  return await sendSmelterRequest('get', `/suggestions/mp4s`);
}

export async function getKickSuggestions(): Promise<KickSuggestions> {
  return await sendSmelterRequest('get', `/suggestions/kick`);
}

export async function addTwitchInput(roomId: string, channelId: string) {
  return await sendSmelterRequest(
    'post',
    `/room/${encodeURIComponent(roomId)}/input`,
    {
      type: 'twitch-channel',
      channelId: channelId,
    },
  );
}
export async function addKickInput(roomId: string, channelId: string) {
  return await sendSmelterRequest(
    'post',
    `/room/${encodeURIComponent(roomId)}/input`,
    {
      type: 'kick-channel',
      channelId: channelId,
    },
  );
}

export async function addMP4Input(roomId: string, mp4FileName: string) {
  return await sendSmelterRequest(
    'post',
    `/room/${encodeURIComponent(roomId)}/input`,
    { type: 'local-mp4', source: { fileName: mp4FileName, url: '' } },
  );
}

export async function removeInput(roomId: string, inputId: string) {
  return await sendSmelterRequest(
    'delete',
    `/room/${encodeURIComponent(roomId)}/input/${encodeURIComponent(inputId)}`,
    {},
  );
}

export async function addCameraInput(roomId: string) {
  const response = await sendSmelterRequest(
    'post',
    `/room/${encodeURIComponent(roomId)}/input`,
    { type: 'whip' },
  );
  console.log('addCameraInput', response);
  return response;
}

export async function getAllRooms(): Promise<any> {
  const rooms = await sendSmelterRequest('get', `/rooms`);
  console.log('Rooms info:', rooms);
  return rooms;
}

export type UpdateInputOptions = {
  volume: number;
  shaders?: ShaderConfig[];
};

export async function updateInput(
  roomId: string,
  inputId: string,
  opts: Partial<UpdateInputOptions>,
) {
  console.log(opts);
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

export async function getAvailableShaders(): Promise<AvailableShader[]> {
  const shaders = await sendSmelterRequest('get', `/shaders`);
  return (shaders?.shaders as AvailableShader[]) || [];
}
const sendWhipOffer = async (
  inputId: string,
  bearerToken: string,
  sdp: any,
) => {
  const res = await fetch(`${WHIP_URL}/whip/${inputId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: sdp,
    // ewentualnie: cache: 'no-store'
  });

  const answer = await res.text();
  console.log('answer', answer);
  return {
    ok: res.ok,
    status: res.status,
    answer,
    location: res.headers.get('Location') ?? null,
  };
};

export { sendWhipOffer };
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

import path from 'path';
import type { StoreApi } from 'zustand';
import Smelter from '@swmansion/smelter-node';

import App from './app/App';
import type { RoomStore } from './app/store';
import { createRoomStore } from './app/store';
import { config } from './config';
import { readFile } from 'fs-extra';
import shadersController from './shaders/shaders';

export type SmelterOutput = {
  id: string;
  url: string;
  store: StoreApi<RoomStore>;
};

export type RegisterSmelterInputOptions =
  | {
    type: 'mp4';
    filePath: string;
    loop?: boolean;
  }
  | {
    type: 'hls';
    url: string;
  }
  | {
    type: 'whip';
    url: string;
    transcription: boolean;
  };

// TODO: optional based on env
const MP4_DECODER_MAP = {
  h264: config.h264Decoder,
};

const WHIP_SERVER_DECODER_PREFERENCES = [config.h264Decoder];

type HlsInputRegisterFn = {
  registerInput: (
    inputId: string,
    request: {
      type: 'hls';
      url: string;
      decoderMap: typeof MP4_DECODER_MAP;
    }
  ) => Promise<unknown>;
};

function isFatalSmelterError(err: any): boolean {
  const stack = err?.body?.stack;
  if (!Array.isArray(stack)) {
    return false;
  }
  return stack.some(
    (line: unknown) =>
      typeof line === 'string' &&
      line.includes('host memory allocation has failed')
  );
}

function isAlreadyRegisteredError(err: any): boolean {
  return err?.body?.error_code === 'ENTITY_ALREADY_REGISTERED';
}

export class SmelterManager {
  private instance: Smelter;
  private startedAt: number | null = null;

  constructor() {
    this.instance = new Smelter();
  }

  public getStartTime(): number | null {
    return this.startedAt;
  }

  public async init() {
    await this.instance.init();
    await this.instance.start();
    this.startedAt = Date.now();

    await this.registerBuiltinImage('spinner', {
      serverPath: path.join(__dirname, '../loading.gif'),
      assetType: 'gif',
    });
    await this.registerBuiltinImage('news_strip', {
      serverPath: path.join(process.cwd(), 'mp4s', 'news_strip', 'news_strip.png'),
      assetType: 'png',
    });
    await this.registerBuiltinImage('smelter_logo', {
      serverPath: path.join(__dirname, '../imgs/smelter_logo.png'),
      assetType: 'png',
    });

    for (const shader of shadersController.shaders) {
      await this.registerShaderFromFile(
        shader.id,
        path.join(__dirname, `../shaders/${shader.shaderFile}`)
      );
    }
  }

  public async terminate(): Promise<void> {
    await this.instance.terminate();
  }

  public async registerOutput(roomId: string): Promise<SmelterOutput> {
    let store = createRoomStore();
    try {
      await this.instance.registerOutput(roomId, <App store={store} />, {
        type: 'whep_server',
        video: {
          encoder: config.h264Encoder,
          resolution: {
            width: 2560,
            height: 1440,
          },
        },
        audio: {
          encoder: {
            type: 'opus',
          },
        },
      });
    } catch (err: any) {
      if (isFatalSmelterError(err)) {
        console.error('Fatal Smelter error, exiting for restart', err?.body ?? err);
        process.exit(1);
      }
      throw err;
    }

    return { id: roomId, url: `${config.whepBaseUrl}/${encodeURIComponent(roomId)}`, store };
  }

  public async unregisterOutput(roomId: string): Promise<void> {
    try {
      await this.instance.unregisterOutput(roomId);
    } catch (err: any) {
      if (err.body?.error_code === 'OUTPUT_STREAM_NOT_FOUND') {
        console.log(roomId, 'Output already removed');
        return;
      }
      console.log(err.body, err);
      throw err;
    }
  }

  public async registerInput(inputId: string, opts: RegisterSmelterInputOptions): Promise<string> {
    try {
      if (opts.type === 'whip') {
        const res = await this.instance.registerInput(inputId, {
          type: 'whip_server',
          video: { decoderPreferences: WHIP_SERVER_DECODER_PREFERENCES },
          ...(opts.transcription
            ? { sideChannel: { audio: true, delayMs: 8000 } }
            : {}),
        });
        console.log('whipInput', res);
        if (!res.bearerToken) {
          throw new Error('WHIP input registration succeeded but no bearer token was returned');
        }
        return res.bearerToken;
      } else if (opts.type === 'mp4') {
        await this.instance.registerInput(inputId, {
          type: 'mp4',
          serverPath: opts.filePath,
          decoderMap: MP4_DECODER_MAP,
          loop: opts.loop ?? true,
        });
      } else if (opts.type === 'hls') {
        await (this.instance as unknown as HlsInputRegisterFn).registerInput(inputId, {
          type: 'hls',
          url: opts.url,
          decoderMap: MP4_DECODER_MAP,
        });
      }
    } catch (err: any) {
      if (err.body?.error_code === 'INPUT_STREAM_ALREADY_REGISTERED') {
        throw new Error('already registered');
      }
      try {
        // try to unregister in case it worked
        await this.instance.unregisterInput(inputId);
      } catch (err: any) {
        if (err.body?.error_code === 'INPUT_STREAM_NOT_FOUND') {
          return '';
        }
      }
      console.log(err.body, err);
      throw err;
    }
    return '';
  }

  public async unregisterInput(inputId: string): Promise<void> {
    try {
      await this.instance.unregisterInput(inputId);
    } catch (err: any) {
      if (err.body?.error_code === 'INPUT_STREAM_NOT_FOUND') {
        console.log(inputId, 'Input already removed');
        return;
      }
      console.log(err.body, err);
      throw err;
    }
  }

  public async registerImage(
    imageId: string,
    opts: { serverPath?: string; url?: string; assetType: 'jpeg' | 'png' | 'gif' | 'svg' | 'auto' }
  ): Promise<void> {
    await this.instance.registerImage(imageId, {
      serverPath: opts.serverPath,
      url: opts.url,
      assetType: opts.assetType,
    });
  }

  private async registerBuiltinImage(
    imageId: string,
    opts: { serverPath: string; assetType: 'jpeg' | 'png' | 'gif' | 'svg' | 'auto' }
  ): Promise<void> {
    try {
      await this.instance.registerImage(imageId, opts);
    } catch (err: any) {
      if (isAlreadyRegisteredError(err)) {
        return;
      }
      throw err;
    }
  }

  private async registerShaderFromFile(shaderId: string, file: string) {
    const source = await readFile(file, { encoding: 'utf-8' });

    try {
      await this.instance.registerShader(shaderId, { source });
    } catch (err: any) {
      if (isAlreadyRegisteredError(err)) {
        return;
      }
      throw err;
    }
  }
}

export const SmelterInstance = new SmelterManager();

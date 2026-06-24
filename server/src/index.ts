import { config as loadEnv } from 'dotenv';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';

loadEnv({ path: path.join(__dirname, '../.env.local') });

import { SmelterInstance } from './smelter';
import { routes } from './server/routes';
import { state } from './server/serverState';
import { PythonBridge } from './server/pythonBridge';
import { TwitchChannelSuggestions } from './twitch/TwitchChannelMonitor';
import { KickChannelSuggestions } from './kick/KickChannelMonitor';

const PYTHON_WS_PORT = Number(process.env.SMELTER_DEMO_PY_WS_PORT) || 8082;
const SIDE_CHANNEL_SOCKET_PARENT_DIR = process.env.SMELTER_SIDE_CHANNEL_PARENT_DIR || '/tmp';

let shuttingDown = false;

async function shutdown(socketDir: string, pythonBridge?: PythonBridge): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  pythonBridge?.stop();
  await SmelterInstance.terminate();
  try {
    rmSync(socketDir, { recursive: true, force: true });
  } catch {
    // ignore — process is exiting
  }
}

async function run() {
  console.log('Start monitoring Twitch categories.');
  void TwitchChannelSuggestions.monitor();
  void KickChannelSuggestions.monitor();

  // Socket dir is read by the smelter binary at init, so it must be set
  // before SmelterInstance.init(). Keep the path short because macOS has a
  // small SUN_LEN limit for Unix domain socket paths.
  const socketDir = mkdtempSync(path.join(SIDE_CHANNEL_SOCKET_PARENT_DIR, 'sm-sc-'));
  process.env.SMELTER_SIDE_CHANNEL_SOCKET_DIR = socketDir;

  console.log('Start Smelter instance');
  await SmelterInstance.init();

  const pythonBridge = new PythonBridge({
    port: PYTHON_WS_PORT,
    socketDir,
    onTranscript: ev => state.getRoomForInput(ev.inputId)?.applyTranscript(ev),
  });
  pythonBridge.start();

  const onShutdown = () => {
    void shutdown(socketDir, pythonBridge).finally(() => process.exit(0));
  };
  process.on('SIGINT', onShutdown);
  process.on('SIGTERM', onShutdown);

  const port = Number(process.env.SMELTER_DEMO_API_PORT) || 3001;
  console.log(`Start listening on port ${port}`);
  await routes.listen({ port, host: '0.0.0.0' });
}

void run();

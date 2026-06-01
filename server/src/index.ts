import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SmelterInstance } from './smelter';
import { routes } from './server/routes';
import { state } from './server/serverState';
import { PythonBridge } from './server/pythonBridge';
import { TwitchChannelSuggestions } from './twitch/TwitchChannelMonitor';
import { KickChannelSuggestions } from './kick/KickChannelMonitor';

const PYTHON_WS_PORT = Number(process.env.SMELTER_DEMO_PY_WS_PORT) || 8082;

async function run() {
  console.log('Start monitoring Twitch categories.');
  void TwitchChannelSuggestions.monitor();
  void KickChannelSuggestions.monitor();

  // Socket dir is read by the smelter binary at init, so it must be set
  // before SmelterInstance.init().
  const socketDir = mkdtempSync(path.join(tmpdir(), 'smelter-sidechan-'));
  process.env.SMELTER_SIDE_CHANNEL_SOCKET_DIR = socketDir;
  process.on('SIGINT', () => {
    try {
      rmSync(socketDir, { recursive: true, force: true });
    } catch {
      // ignore — process is exiting
    }
  });

  console.log('Start Smelter instance');
  await SmelterInstance.init();

  new PythonBridge({
    port: PYTHON_WS_PORT,
    socketDir,
    onTranscript: ev => state.getRoomForInput(ev.inputId)?.applyTranscript(ev),
  }).start();

  const port = Number(process.env.SMELTER_DEMO_API_PORT) || 3001;
  console.log(`Start listening on port ${port}`);
  await routes.listen({ port, host: '0.0.0.0' });
}

void run();

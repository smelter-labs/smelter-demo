import Smelter from '@swmansion/smelter-node';
import App from './App';
import { sleep, spawn } from './utils';

export const SmelterInstance = new Smelter();

export async function initializeSmelterInstance() {
  await SmelterInstance.init();

  void spawn("bash", ["-c", "docker run -e NETWORK_TEST_ON_START=false  -e NAT_1_TO_1_IP=127.0.0.1 -p 8080:8080 seaduboi/broadcast-box"]);
  await sleep(5000);

  await SmelterInstance.registerOutput('output_1', <App />, {
    type: 'whip',
    endpointUrl: 'http://127.0.0.1:8080/api/whip',
    bearerToken: 'example',
    video: {
      encoder: {
        type: 'ffmpeg_h264',
        preset: 'ultrafast',
      },
      resolution: {
        width: 1920,
        height: 1080,
      },
    },
    audio: {
      encoder: {
        type: 'opus',
        channels: 'stereo'
      }
    }
  });

  await SmelterInstance.start();
}

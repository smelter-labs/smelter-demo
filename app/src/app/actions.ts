export type StreamInfo = {
  id: string;
  label: string;
};

export type Layout =
  | 'grid'
  | 'primary-on-left'
  | 'primary-on-top'
  | 'secondary-in-corner';

export type StreamOptions = {
  availableStreams: StreamInfo[];
  connectedStreamIds: string[];
  audioStreamId?: string;
  layout: Layout;
};

// Mock sendSmelterRequest to simulate backend responses
async function sendSmelterRequest(
  method: 'get' | 'post',
  route: string,
  body?: any,
): Promise<any> {
  // Simulate different server responses based on the endpoint and method
  switch (route) {
    case '/update-layout':
      // Simulate successful layout update
      console.log(`Layout updated to: ${body?.layout}`);
      return Promise.resolve();
    case '/add-stream':
      // Simulate successful stream addition
      console.log(`Stream added with ID: ${body?.streamId}`);
      return Promise.resolve();
    case '/remove-stream':
      // Simulate successful stream removal
      console.log(`Stream removed with ID: ${body?.streamId}`);
      return Promise.resolve();
    case '/select-audio':
      // Simulate successful audio stream selection
      console.log(`Audio stream selected with ID: ${body?.streamId}`);
      return Promise.resolve();
    case '/state':
      // Simulate fetching state from backend
      return Promise.resolve({
        availableStreams: [
          { id: 'streamingourzoo', label: 'Zoo Camera' },
          { id: 'naturerelax_24h', label: 'Water Camera' },
        ],
        connectedStreamIds: ['streamingourzoo'],
        audioStreamId: 'streamingourzoo',
        layout: 'primary-on-top',
      });
    default:
      throw new Error('Unknown route');
  }
}

export async function updateLayout(layout: Layout): Promise<void> {
  return await sendSmelterRequest('post', '/update-layout', { layout });
}

export async function addStream(streamId: string): Promise<void> {
  return await sendSmelterRequest('post', '/add-stream', { streamId });
}

export async function removeStream(streamId: string): Promise<void> {
  return await sendSmelterRequest('post', '/remove-stream', { streamId });
}

export async function selectAudioStream(streamId?: string): Promise<void> {
  return await sendSmelterRequest('post', '/select-audio', { streamId });
}

export async function getSmelterState(): Promise<StreamOptions> {
  return await sendSmelterRequest('get', '/state');
}

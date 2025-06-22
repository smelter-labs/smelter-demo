'use server';

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

async function sendSmelterRequest(
  method: 'get' | 'post',
  route: string,
  body?: object,
): Promise<any> {
  const response = await fetch(`http://127.0.0.1:3001${route}`, {
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
    } catch (err) {
      console.error('Failed to parse response');
    }
    throw err;
  }
  return (await response.json()) as object;
}

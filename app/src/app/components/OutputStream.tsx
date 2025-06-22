'use client';

import { useEffect, useRef } from 'react';

export default function OutputStream() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // connect('http://127.0.0.1:8080/api/whep', 'example').then((stream) => {
    //   if (videoRef.current) {
    //     videoRef.current.srcObject = stream;
    //   }
    // });
  }, []);

  return (
    <video
      ref={videoRef}
      className='rounded-md'
      src='example-video.mp4'
      controls
      autoPlay
      autoFocus
    />
  );
}

async function connect(
  endpointUrl: string,
  token: string,
): Promise<MediaStream> {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    bundlePolicy: 'max-bundle',
  });

  const tracksPromise = new Promise<{
    video: MediaStreamTrack;
    audio: MediaStreamTrack;
  }>((res) => {
    let videoTrack: undefined | MediaStreamTrack;
    let audioTrack: undefined | MediaStreamTrack;
    pc.ontrack = (ev: RTCTrackEvent) => {
      if (ev.track.kind === 'video') {
        console.log('New video track');
        videoTrack = ev.track;
      }
      if (ev.track.kind === 'audio') {
        console.log('New audio track');
        audioTrack = ev.track;
      }
      if (videoTrack && audioTrack) {
        res({ video: videoTrack, audio: audioTrack });
      }
    };
  });

  console.log('add transceivers');
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  console.log('establish WHEP connection');
  await establishWhipConnection(pc, endpointUrl, token);

  const tracks = await tracksPromise;

  const stream = new MediaStream();
  stream.addTrack(tracks.video);
  stream.addTrack(tracks.audio);
  return stream;
}

async function establishWhipConnection(
  pc: RTCPeerConnection,
  endpoint: string,
  token?: string,
): Promise<string> {
  await pc.setLocalDescription(await pc.createOffer());

  const offer = await gatherICECandidates(pc);
  if (!offer) {
    throw Error('failed to gather ICE candidates for offer');
  }

  /**
   * This response contains the server's SDP offer.
   * This specifies how the client should communicate,
   * and what kind of media client and server have negotiated to exchange.
   */
  const { sdp: sdpAnswer, location } = await postSdpOffer(
    endpoint,
    offer.sdp,
    token,
  );

  await pc.setRemoteDescription(
    new RTCSessionDescription({ type: 'answer', sdp: sdpAnswer }),
  );
  return location ?? endpoint;
}

async function gatherICECandidates(
  peerConnection: RTCPeerConnection,
): Promise<RTCSessionDescription | null> {
  return new Promise<RTCSessionDescription | null>((res) => {
    setTimeout(function () {
      res(peerConnection.localDescription);
    }, 2000);

    peerConnection.onicegatheringstatechange = () => {
      if (peerConnection.iceGatheringState === 'complete') {
        res(peerConnection.localDescription);
      }
    };
  });
}

async function postSdpOffer(
  endpoint: string,
  sdpOffer: string,
  token?: string,
): Promise<{ sdp: string; location: string }> {
  const response = await fetch(endpoint, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'content-type': 'application/sdp',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: sdpOffer,
  });

  if (response.status === 201) {
    return {
      sdp: await response.text(),
      location: getLocationFromHeader(response.headers, endpoint),
    };
  } else {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

function getLocationFromHeader(headers: Headers, endpoint: string): string {
  const locationHeader = headers.get('Location');
  if (!locationHeader) {
    // e.g. Twitch CORS blocks access to Location header, so in this case let's assume that
    // location is under the same URL.
    return endpoint;
  }

  return new URL(locationHeader, endpoint).toString();
}

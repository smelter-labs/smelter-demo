'use client';

import { RefObject, useEffect } from 'react';

export default function OutputStream({
  whepUrl,
  videoRef,
}: {
  whepUrl: string;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  useEffect(() => {
    connect(whepUrl).then((stream) => {
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    });
  }, [videoRef, whepUrl]);

  return (
    <video
      id='videoPlayer'
      ref={videoRef}
      className='rounded-md'
      controls
      autoPlay
      autoFocus
      width={1920}
      height={1080}
    />
  );
}

async function connect(endpointUrl: string): Promise<MediaStream> {
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
        videoTrack = ev.track;
      }
      if (ev.track.kind === 'audio') {
        audioTrack = ev.track;
      }
      if (videoTrack && audioTrack) {
        res({ video: videoTrack, audio: audioTrack });
      }
    };
  });

  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  await establishWhipConnection(pc, endpointUrl);

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

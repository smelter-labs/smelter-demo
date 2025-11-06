export function stopStream(s: MediaStream | null) {
  s?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {}
  });
}

export function attachLocalPreview(stream: MediaStream | null) {
  const el = document.getElementById(
    'local-preview',
  ) as HTMLVideoElement | null;
  if (el) {
    if (stream) {
      el.srcObject = stream;
      el.play?.().catch(() => {});
    } else {
      // @ts-expect-error - srcObject is not defined in the global scope, but it is defined in the HTMLVideoElement interface
      el.srcObject = null;
      el.pause?.();
    }
  }
}

// Helper to stop camera and close peer connection
export function stopCameraAndConnection(
  pcRef: React.MutableRefObject<RTCPeerConnection | null>,
  streamRef: React.MutableRefObject<MediaStream | null>,
) {
  console.log('[WHIP] Stopping camera and closing connection');
  // @ts-expect-error - RTCPeerConnection is not defined in the global scope, but it is defined in the RTCPeerConnection interface
  try {
    pcRef.current?.close();
  } catch {}
  stopStream(streamRef.current);
  attachLocalPreview(null);
  pcRef.current = null;
  streamRef.current = null;
}

import { useEffect, useRef } from 'react';
import { acknowledgeWhipInput } from '@/app/actions/actions';

const HEARTBEAT_INTERVAL_MS = 5000; // 10 seconds

/**
 * Hook to periodically send acknowledgment to the backend that the WHIP input is still active.
 * This helps the backend know that the input is still being used.
 */
export function useWhipHeartbeat(
  roomId: string,
  inputId: string | null,
  isActive: boolean,
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only start heartbeat if we have an inputId and the connection is active
    if (!inputId || !isActive) {
      return;
    }

    console.log('[WHIP Heartbeat] Starting heartbeat for input:', inputId);

    // // Send initial acknowledgment immediately
    // acknowledgeWhipInput(roomId, inputId).catch((err) => {
    //     console.warn('[WHIP Heartbeat] Failed to send initial ack:', err);
    // });

    // Set up periodic acknowledgment
    intervalRef.current = setInterval(() => {
      acknowledgeWhipInput(roomId, inputId).catch((err) => {
        console.warn('[WHIP Heartbeat] Failed to send ack:', err);
      });
    }, HEARTBEAT_INTERVAL_MS);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        console.log('[WHIP Heartbeat] Stopping heartbeat for input:', inputId);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [roomId, inputId, isActive]);
}

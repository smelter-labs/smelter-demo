import { useEffect, useMemo, useRef } from 'react';
import { addCameraInput, removeInput, type Input } from '@/app/actions/actions';
import {
  loadLastWhipInputId,
  loadWhipSession,
  saveLastWhipInputId,
  saveWhipSession,
  tryAcquireAutoResumeLock,
  clearWhipSession,
} from '../utils/whip-storage';
import type { AddInputResponse } from '../utils/types';
import { startPublish } from '../utils/whip-publisher';
import { stopCameraAndConnection } from '../utils/preview';
import { deleteWhipResource } from '../utils/whip-api';

export function useAutoResume(
  roomId: string,
  userName: string,
  pcRef: React.MutableRefObject<RTCPeerConnection | null>,
  streamRef: React.MutableRefObject<MediaStream | null>,
  inputs: Input[],
  setActiveWhipInputId?: (id: string | null) => void,
  setIsWhipActive?: (active: boolean) => void,
) {
  const isPageReload = useMemo(() => {
    try {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      return nav?.type === 'reload';
    } catch {
      return false;
    }
  }, []);

  const startedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        if (startedRef.current) return;
        console.log('useAutoResume', isPageReload);
        if (!isPageReload) return;
        const acquired = tryAcquireAutoResumeLock(roomId);
        if (!acquired) return;

        startedRef.current = true;
        if (pcRef.current) return;

        const lastInputId = loadLastWhipInputId(roomId);
        if (!lastInputId) return;

        // Check if there's already a WHIP input with the same username
        const trimmedUserName = userName.trim();
        const existingWhipInput = inputs.find(
          (input) => input.type === 'whip' && input.title === trimmedUserName,
        );

        // No existing input with same username; remove old last saved input before creating a new one
        try {
          await removeInput(roomId, lastInputId);
        } catch {}

        // Clean up any previous WHIP session/resource (same as handleAddWhip)
        const oldSession = loadWhipSession();
        if (oldSession?.location && oldSession?.bearerToken) {
          try {
            await deleteWhipResource(
              oldSession.location,
              oldSession.bearerToken,
            );
          } catch (e) {
            console.warn('Failed to delete old WHIP resource:', e);
          }
        }
        clearWhipSession();

        // Always create a new WHIP input (same as handleAddWhip)
        const nameArg = trimmedUserName || undefined;
        const resp: AddInputResponse = await addCameraInput(roomId, nameArg);

        // Set active WHIP input for heartbeat
        if (setActiveWhipInputId) setActiveWhipInputId(resp.inputId);
        if (setIsWhipActive) setIsWhipActive(false);

        // Callback to stop camera when connection is lost
        const onDisconnected = () => {
          stopCameraAndConnection(pcRef, streamRef);
          if (setIsWhipActive) setIsWhipActive(false);
        };

        const { location } = await startPublish(
          resp.inputId,
          resp.bearerToken,
          pcRef,
          streamRef,
          onDisconnected,
        );

        // Connection established successfully
        if (setIsWhipActive) setIsWhipActive(true);

        saveWhipSession({
          roomId,
          inputId: resp.inputId,
          bearerToken: resp.bearerToken,
          location,
          ts: Date.now(),
        });
        saveLastWhipInputId(roomId, resp.inputId);
      } catch (e) {
        if (setActiveWhipInputId) setActiveWhipInputId(null);
        if (setIsWhipActive) setIsWhipActive(false);
      }
    })();
  }, [roomId]);
}

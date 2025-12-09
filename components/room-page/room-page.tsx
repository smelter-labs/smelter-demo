'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import Link from 'next/link';

import { getRoomInfo, RoomState } from '@/app/actions/actions';
import LoadingSpinner from '@/components/ui/spinner';
import { WarningBanner } from '@/components/warning-banner';
import SmelterLogo from '@/components/ui/smelter-logo';
import { staggerContainer } from '@/utils/animations';
import RoomView from '@/components/pages/room-view';
import {
  DriverTourProvider,
  DriverToursProvider,
} from '../tour/DriverTourContext';
import { useDriverTourControls } from '../tour/DriverTourContext';
import {
  composingTourSteps,
  commonTourOptions,
  mobileTourSteps,
  roomTourSteps,
  shadersTourSteps,
  mobileTourOptions,
} from '../tour/tour-config';
import TourLauncher from '@/components/room-page/TourLauncher';

export default function RoomPage() {
  const router = useRouter();
  const { roomId } = useParams();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [roomState, setRoomState] = useState<RoomState>({
    inputs: [],
    layout: 'grid',
    whepUrl: '',
  });

  const refreshState = useCallback(async () => {
    if (!roomId) return;

    const state = await getRoomInfo(roomId as string);

    if (state === 'not-found') {
      toast.error('Room was closed, Redirecting ...');
      if (pathname?.toLowerCase().includes('kick')) {
        router.push('/kick');
      } else {
        router.push('/');
      }
    } else {
      setRoomState(state);
      setLoading(false);
    }
  }, [roomId, router, pathname]);

  useEffect(() => {
    void refreshState();
    const interval = setInterval(refreshState, 3_000);
    return () => clearInterval(interval);
  }, [refreshState]);

  function MobileTourAutostart({ loading }: { loading: boolean }) {
    const { start } = useDriverTourControls('mobile');
    const startedRef = useRef(false);
    useEffect(() => {
      // if (loading) return;
      // if (typeof window === 'undefined') return;
      // if (startedRef.current) return;
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (!isMobile) return;
      const alreadyShown =
        window.sessionStorage.getItem('mobileTourShown') === '1';
      if (alreadyShown) return;
      startedRef.current = true;
      // Delay slightly to ensure DOM has settled
      const id = window.setTimeout(() => {
        try {
          window.sessionStorage.setItem('mobileTourShown', '1');
        } catch {}
        start();
      }, 1500);
      return () => window.clearTimeout(id);
    }, [loading, start]);
    return null;
  }

  function HashTourAutostart({ loading }: { loading: boolean }) {
    const roomCtl = useDriverTourControls('room');
    const composingCtl = useDriverTourControls('composing');
    const shadersCtl = useDriverTourControls('shaders');
    const didStartRef = useRef(false);
    let hash = '';
    if (typeof window !== 'undefined') {
      console.log('window.location.hash', window.location.hash);
      const h = (window.location.hash || '').toLowerCase();
      if (
        h.includes('tour-main') ||
        h.includes('tour-composing') ||
        h.includes('tour-shaders')
      ) {
        hash = h;
        window.location.hash = '';
        setTimeout(() => {
          if (h.includes('tour-main')) {
            roomCtl.start();
          } else if (h.includes('tour-composing')) {
            composingCtl.start();
          } else if (h.includes('tour-shaders')) {
            shadersCtl.start();
          }
        }, 500);
      }
    }
    return null;
  }

  return (
    <DriverToursProvider>
      <DriverTourProvider
        id='mobile'
        steps={mobileTourSteps}
        options={mobileTourOptions}>
        {/*
          Force-stop any running tours the moment the room is pending deletion.
          This component uses the DriverTour context, so it must be rendered
          within the providers.
        */}
        {(() => {
          function StopToursOnPendingDelete({ pending }: { pending: boolean }) {
            const { forceStop: stopMobile } = useDriverTourControls('mobile');
            const { forceStop: stopRoom } = useDriverTourControls('room');
            const { forceStop: stopShaders } = useDriverTourControls('shaders');
            const { forceStop: stopComposing } =
              useDriverTourControls('composing');
            const didStopRef = useRef(false);
            useEffect(() => {
              if (!pending || didStopRef.current) return;
              didStopRef.current = true;
              stopMobile?.();
              stopRoom?.();
              stopShaders?.();
              stopComposing?.();
            }, [pending, stopMobile, stopRoom, stopShaders, stopComposing]);
            return null;
          }
          return (
            <StopToursOnPendingDelete pending={!!roomState.pendingDelete} />
          );
        })()}
        <DriverTourProvider
          id='room'
          steps={roomTourSteps}
          options={commonTourOptions}>
          <DriverTourProvider
            id='shaders'
            steps={shadersTourSteps}
            options={commonTourOptions}>
            <DriverTourProvider
              id='composing'
              steps={composingTourSteps}
              options={commonTourOptions}>
              <MobileTourAutostart loading={loading} />
              <HashTourAutostart loading={loading} />
              <motion.div
                variants={staggerContainer}
                className='h-screen flex flex-col p-2 py-4 md:p-4 bg-black-100'>
                <div className='flex items-center justify-between'>
                  <div
                    style={{
                      display: 'inline-block',
                      width: `${162.5 / 1.2}px`,
                      height: `${21.25 / 1.2}px`,
                    }}>
                    <SmelterLogo />
                  </div>
                  <div className='hidden md:block'>
                    <TourLauncher />
                  </div>
                </div>
                {roomState.pendingDelete && (
                  <Link href='/'>
                    <WarningBanner>
                      This room will be removed shortly, go to the main page and
                      start a new one.
                    </WarningBanner>
                  </Link>
                )}

                {loading ? (
                  <motion.div
                    variants={staggerContainer}
                    className='flex-1 grid min-h-0 justify-center content-center'>
                    <LoadingSpinner size='lg' variant='spinner' />
                  </motion.div>
                ) : (
                  <RoomView
                    roomState={roomState}
                    roomId={roomId as string}
                    refreshState={refreshState}
                  />
                )}
              </motion.div>
            </DriverTourProvider>
          </DriverTourProvider>
        </DriverTourProvider>
      </DriverTourProvider>
    </DriverToursProvider>
  );
}

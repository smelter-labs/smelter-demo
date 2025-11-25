'use client';

import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useDriverTourControls } from '../tour/DriverTourContext';

export default function TourLauncher() {
  // For arrow visibility timing
  const [showArrow, setShowArrow] = useState(false);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInteractedRef = useRef(false);

  // Persist handleAnyInteraction function identity for event + imperative call
  const handleAnyInteractionRef = useRef<(() => void) | null>(null);

  // Hide arrow after 5s since first interaction
  useEffect(() => {
    function handleAnyInteraction() {
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        setShowArrow(false);
        window.removeEventListener('pointerdown', handleAnyInteraction, true);
        window.removeEventListener('keydown', handleAnyInteraction, true);
      }
    }
    handleAnyInteractionRef.current = handleAnyInteraction;

    // Initial timeout for 25s after mount
    timeoutIdRef.current = setTimeout(() => {
      setShowArrow(false);
    }, 25000);

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      window.removeEventListener('pointerdown', handleAnyInteraction, true);
      window.removeEventListener('keydown', handleAnyInteraction, true);
    };
  }, []);

  const { start: startRoomTour, stop: stopRoomTour } =
    useDriverTourControls('room');
  const { start: startShadersTour, stop: stopShadersTour } =
    useDriverTourControls('shaders');
  const { start: startComposingTour, stop: stopComposingTour } =
    useDriverTourControls('composing');

  // We'll use a ref to the button to measure alignment
  const roomTourBtnRef = useRef<HTMLButtonElement>(null);

  // Calculate left position for the arrow so it's centered to the icon
  const [arrowLeft, setArrowLeft] = useState<number | null>(null);

  useEffect(() => {
    if (roomTourBtnRef.current) {
      // Set left position so the arrow is horizontally centered under the icon
      const btnRect = roomTourBtnRef.current.getBoundingClientRect();
      // Find the offsetLeft relative to the parent (.relative flex)
      const parentRect =
        roomTourBtnRef.current.parentElement?.parentElement?.getBoundingClientRect();
      if (parentRect) {
        const centerOffset =
          btnRect.left - parentRect.left + btnRect.width / 2 - 13; // 13px is half arrow SVG width (26)
        setArrowLeft(centerOffset);
      }
    }
  }, [showArrow]); // recalc when showArrow, in case the component moves

  // Helper to manually "interact" (i.e., hide the arrow)
  const markInteracted = () => {
    if (handleAnyInteractionRef.current) {
      handleAnyInteractionRef.current();
    }
  };

  return (
    <div
      className='ml-auto flex items-center relative'
      data-tour='tour-launcher-container'
      style={{ minHeight: 52 /* increases click area for pointer events */ }}>
      <span className='mr-2 text-white/70 text-sm font-bold'>Showcase:</span>
      <div className='relative flex items-center flex-col'>
        <button
          ref={roomTourBtnRef}
          aria-label='Hello Smelter!'
          title='Hello Smelter!'
          onClick={() => {
            stopComposingTour?.();
            stopShadersTour?.();
            startRoomTour();
            markInteracted(); // <-- Hide arrow when tour is started
          }}
          className='disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/10 transition-colors cursor-pointer z-10'
          id='room-tour-launch-btn'
          style={{ position: 'relative', zIndex: 2 }}>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='w-5 h-5 text-white/80 hover:text-white'>
            <circle cx='12' cy='12' r='10' />
            <path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4' />
            <line x1='12' y1='17' x2='12.01' y2='17' />
          </svg>
        </button>
        {/* Arrow is now handled OUTSIDE of the flex-col, but over the same icon */}
      </div>
      {/* Animated Arrow: positioned absolutely and centered horizontally under the button icon (using calculated left) */}
      {showArrow && (
        <div
          style={{
            position: 'absolute',
            left: arrowLeft !== null ? `${arrowLeft}px` : '86px', // fallback left
            top: '50%',
            transform: 'translateY(24px)',
            width: '26px',
            height: '26px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 20,
            transition: 'left 0.18s cubic-bezier(.41,1.8,.5,.89)',
          }}>
          <svg
            width='26'
            height='26'
            viewBox='0 0 26 26'
            fill='white'
            xmlns='http://www.w3.org/2000/svg'
            className='animate-bounceArrowDown'
            style={{
              filter: 'drop-shadow(0 1px 8px rgba(0,0,0,0.25))',
            }}>
            <g>
              <polygon
                points='13,21 5,11 9.5,11 9.5,5 16.5,5 16.5,11 21,11'
                fill='white'
                stroke='#fff'
                strokeWidth='1'
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))' }}
                transform='rotate(180 13 13)'
              />
            </g>
          </svg>
          {/* subtle "Tour" label - optional */}
          {/* <span style={{color: 'white', fontSize: 10, marginTop: -4}}>Tour</span> */}
        </div>
      )}
      {/* Arrow animation styles are global here */}
      <style jsx>{`
        @keyframes bounceArrowDown {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(10px);
          }
        }
        .animate-bounceArrowDown {
          animation: bounceArrowDown 0.7s cubic-bezier(0.41, 1.8, 0.5, 0.89)
            infinite;
        }
      `}</style>
      <button
        aria-label='Using Shaders'
        title='Using Shaders'
        onClick={() => {
          stopRoomTour?.();
          stopComposingTour?.();
          startShadersTour();
        }}
        className='disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/10 transition-colors cursor-pointer'>
        <SlidersHorizontal className='w-5 h-5 text-white/80 hover:text-white' />
      </button>
      <button
        aria-label='Composing Videos'
        title='Composing Videos'
        onClick={() => {
          stopRoomTour?.();
          stopShadersTour?.();
          startComposingTour();
        }}
        className='disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/10 transition-colors cursor-pointer'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          className='w-5 h-5 text-white/80 hover:text-white'>
          <rect x='3' y='3' width='18' height='18' rx='4' />
          <path d='M7 7h10v10H7z' />
          <path d='M7 17l10-10' opacity='.6' />
        </svg>
      </button>
    </div>
  );
}

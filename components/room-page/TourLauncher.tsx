'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useDriverTourControls } from '../tour/DriverTourContext';

export default function TourLauncher() {
  const { start: startRoomTour, stop: stopRoomTour } =
    useDriverTourControls('room');
  const { start: startShadersTour, stop: stopShadersTour } =
    useDriverTourControls('shaders');
  const { start: startComposingTour, stop: stopComposingTour } =
    useDriverTourControls('composing');
  return (
    <div
      className='ml-auto flex items-center'
      data-tour='tour-launcher-container'>
      <span className='mr-2 text-white/70 text-sm font-bold'>Showcase:</span>
      <button
        aria-label='Hello Smelter!'
        title='Hello Smelter!'
        onClick={() => {
          stopComposingTour?.();
          stopShadersTour?.();
          startRoomTour();
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
          <circle cx='12' cy='12' r='10' />
          <path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4' />
          <line x1='12' y1='17' x2='12.01' y2='17' />
        </svg>
      </button>
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

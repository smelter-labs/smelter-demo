import type { DriveStep } from 'driver.js';
import type { useDriverTour } from './useDriverTour';

export const roomTourSteps: DriveStep[] = [
  {
    element: '[data-tour="video-player-container"]',
    popover: {
      title: 'Hello Smelter!',
      description:
        'What you see right now is video composed in real time from multiple sources. Can you believe that?',
      side: 'bottom',
      align: 'center',
      showButtons: ['next'],
    },
  },
  {
    element: '[data-tour="twitch-add-input-form-container"]',
    popover: {
      title: "Let's add some streams!",
      description:
        'You can add streams from Twitch, Kick or any hls/webrtc source. ',
      side: 'left',
      align: 'center',
      showButtons: [],
    },
  },
  {
    element: '[data-tour="twitch-suggestion-item-container"]',
    popover: {
      title: 'Click to add',
      description: "Just click 'Add' to add the stream.",
      side: 'left',
      align: 'start',
      showButtons: [],
    },
  },
  {
    element: '[data-tour="video-player-container"]',
    popover: {
      title: 'Stream is loading...',
      description: 'Wait a moment, the stream is loading...',
      side: 'right',
      align: 'center',
      showButtons: [],
    },
  },
  {
    element: '[data-tour="video-player-container"]',
    popover: {
      title: 'Stream is ready!',
      description: 'The stream is ready to watch. ',
      side: 'bottom',
      align: 'center',
      showButtons: ['next'],
    },
  },
  {
    element: '[data-tour="tour-launcher-container"]',
    popover: {
      title: "What's next?",
      description:
        'You can play around by yourself, but you can also start one of the tours to see what Smelter can do.',
      side: 'bottom',
      align: 'center',
      showButtons: ['next'],
    },
  },
];

export const tourOptions: Parameters<typeof useDriverTour>[2] = {
  showProgress: false,
  nextBtnText: 'Next',
  prevBtnText: 'Previous',
  doneBtnText: 'Done',
  stageRadius: 25,
};

export const composingTourSteps: DriveStep[] = [
  {
    element: '[data-tour="streams-list-container"]',
    popover: {
      title: 'Composing Videos',
      description:
        'You can compose video in real time. Just drag and drop the sources to the desired position.',
      side: 'left',
      align: 'center',
      showButtons: [],
    },
  },
  {
    element: '[data-tour="streams-list-container"]',
    popover: {
      title: 'Composing Videos',
      description:
        'You can compose video in real time. Just drag and drop the sources to the desired position.',
      side: 'left',
      align: 'center',
      showButtons: ['next'],
    },
  },
  {
    element: '[data-tour="layout-selector-container"]',
    popover: {
      title: 'Layouts',
      description:
        'You can change the layout of the video. Just click on the layout you want to use.',
      side: 'left',
      align: 'center',
      showButtons: [],
    },
  },
  {
    element: '[data-tour="layout-selector-container"]',
    popover: {
      title: 'Layouts',
      description:
        'You can change the layout of the video. Just click on the layout you want to use.',
      side: 'left',
      align: 'center',
      showButtons: ['next'],
    },
  },
  {
    element: '[data-tour="video-player-container"]',
    popover: {
      title: 'It happens in real time!',
      description:
        'As the video is composed in real time, you can see the result of your actions immediately.',
      side: 'bottom',
      align: 'center',
      showButtons: ['next'],
    },
  },
];

export const shadersTourSteps: DriveStep[] = [
  {
    element: '[data-tour="streams-list-container"]',
    popover: {
      title: 'Using Shaders',
      description:
        'Each video can be processed with various shaders. Just click "Show FX" button to see available shaders.',
      side: 'left',
      align: 'center',
      showButtons: [],
    },
  },
  {
    element: '[data-tour="streams-list-container"]',
    popover: {
      title: 'Using Shaders',
      description:
        'We have prepared some shaders but you can create your own. Just click "Enable" button to enable the shader you want to use.',
      side: 'left',
      align: 'center',
      showButtons: [],
    },
  },
  {
    element: '[data-tour="video-player-container"]',
    popover: {
      title: 'Shader is enabled!',
      description:
        'The shader is enabled and you can see the result of your actions immediately.',
      side: 'bottom',
      align: 'center',
      showButtons: ['next'],
    },
  },
  {
    element: '[data-tour="streams-list-container"]',
    popover: {
      title: 'Using Shaders',
      description:
        'Now you can adjust the shader parameters to your liking. Just move the slider to the desired value.',
      side: 'left',
      align: 'center',
      showButtons: ['next'],
    },
  },
];

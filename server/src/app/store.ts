import type { StoreApi } from 'zustand';
import { createStore } from 'zustand';
import type { ShaderConfig } from '../shaders/shaders';
import { createContext } from 'react';

export type InputConfig = {
  inputId: string;
  volume: number;
  title: string;
  description: string;
  showTitle?: boolean;
  shaders: ShaderConfig[];
  imageId?: string;
  replaceWith?: InputConfig;
};

export const Layouts = [
  'grid',
  'primary-on-left',
  'primary-on-top',
  'picture-in-picture',
  'wrapped',
  'wrapped-static',
  'transition',
] as const;

export type Layout =
  | 'grid'
  | 'primary-on-left'
  | 'primary-on-top'
  | 'picture-in-picture'
  | 'wrapped'
  | 'wrapped-static'
  | 'transition';

export type RoomStore = {
  inputs: InputConfig[];
  layout: Layout;
  transcripts: Record<string, string>;
  updateState: (inputs: InputConfig[], layout: Layout) => void;
  setTranscript: (inputId: string, text: string) => void;
};

export function createRoomStore(): StoreApi<RoomStore> {
  return createStore<RoomStore>(set => ({
    inputs: [],
    layout: 'grid',
    transcripts: {},
    updateState: (inputs: InputConfig[], layout: Layout) => {
      set(_state => ({ inputs, layout }));
    },
    setTranscript: (inputId: string, text: string) => {
      set(state => {
        const next = { ...state.transcripts };
        if (text) next[inputId] = text;
        else delete next[inputId];
        return { transcripts: next };
      });
    },
  }));
}

export const StoreContext = createContext<StoreApi<RoomStore>>(createRoomStore());

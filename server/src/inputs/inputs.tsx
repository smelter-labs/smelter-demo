import type { InputConfig } from '../app/store';
import type { ShaderParamStructField } from '@swmansion/smelter';
import {
  Text,
  View,
  InputStream,
  Image,
  Rescaler,
  useInputStreams,
  Shader,
} from '@swmansion/smelter';

import { useContext, useEffect, useRef, useState, type ReactElement } from 'react';
import { useStore } from 'zustand';
import type { ShaderConfig, ShaderParamConfig } from '../shaders/shaders';
import { StoreContext } from '../app/store';

type Resolution = { width: number; height: number };

function wrapWithShaders(
  component: ReactElement,
  shaders: ShaderConfig[] | undefined,
  resolution: Resolution,
  index: number = 0
): ReactElement {
  if (!shaders || index >= shaders.length) {
    return component;
  }
  const shader = shaders[index];
  const shaderParams = Array.isArray(shader.params)
    ? shader.params.map(
      (param: ShaderParamConfig) =>
        ({
          type: 'f32',
          fieldName: param.paramName,
          value: param.paramValue,
        }) as ShaderParamStructField
    )
    : [];
  return (
    <Shader
      shaderId={shader.shaderId}
      resolution={resolution}
      shaderParam={
        shaderParams.length > 0
          ? {
            type: 'struct',
            value: shaderParams,
          }
          : undefined
      }>
      {wrapWithShaders(component, shaders, resolution, index + 1)}
    </Shader>
  );
}

export function Input({
  input,
  subtitlePosition = 'bottom',
}: {
  input: InputConfig;
  subtitlePosition?: 'bottom' | 'top-left';
}) {
  const streams = useInputStreams();
  const isImage = !!input.imageId;
  const actualStreamState = isImage ? 'playing' : (streams[input.inputId]?.videoState ?? 'finished');
  // Looping videos briefly flip between states between iterations — defer every
  // transition 100ms and only apply it if the value is still the same after the wait.
  const [streamState, setStreamState] = useState(actualStreamState);
  const actualStreamStateRef = useRef(actualStreamState);
  actualStreamStateRef.current = actualStreamState;
  useEffect(() => {
    const target = actualStreamState;
    const timer = setTimeout(() => {
      if (actualStreamStateRef.current === target) {
        setStreamState(target);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [actualStreamState]);
  const resolution = { width: 1920, height: 1080 };
  const store = useContext(StoreContext);
  const transcript = useStore(store, s => s.transcripts[input.inputId] ?? '');

  const inputComponent = (
    <Rescaler style={resolution}>
      <View style={{ ...resolution, direction: 'column' }}>
        {streamState === 'playing' ? (
          isImage ? (
            <Rescaler style={{ rescaleMode: 'fit' }}>
              <Image imageId={input.imageId!} />
            </Rescaler>
          ) : (
            <View style={{ ...resolution }}>
              <Rescaler style={{ rescaleMode: 'fill' }}>
                <InputStream inputId={input.inputId} volume={input.volume} />
              </Rescaler>
              {transcript ? (
                <Subtitle text={transcript} parent={resolution} position={subtitlePosition} />
              ) : null}
            </View>
          )
        ) : streamState === 'ready' ? (
          <View style={{ padding: 300 }}>
            <Rescaler style={{ rescaleMode: 'fit' }}>
              <Image imageId="spinner" />
            </Rescaler>
          </View>
        ) : streamState === 'finished' ? (
          <View style={{ padding: 300 }}>
            <Rescaler style={{ rescaleMode: 'fit' }}>
              <Text style={{ fontSize: 600 }}>Stream offline</Text>
            </Rescaler>
          </View>
        ) : (
          <View />
        )}
        {input.showTitle !== false && (
          <View
            style={{
              backgroundColor: '#493880',
              height: 90,
              padding: 20,
              borderRadius: 0,
              direction: 'column',
              overflow: 'visible',
              bottom: 0,
              left: 0,
            }}>
            <Text style={{ fontSize: 40, color: 'white' }}>{input?.title}</Text>
            <View style={{ height: 10 }} />

            <Text style={{ fontSize: 25, color: 'white' }}>{input?.description}</Text>
          </View>
        )}
      </View>
    </Rescaler>
  );

  const activeShaders = input.shaders.filter(shader => shader.enabled);

  return wrapWithShaders(inputComponent, activeShaders, resolution, 0);
}

export function SmallInput({
  input,
  resolution = { width: 640, height: 360 },
}: {
  input: InputConfig;
  resolution?: Resolution;
}) {
  const activeShaders = input.shaders.filter(shader => shader.enabled);
  const isImage = !!input.imageId;
  const smallInputComponent = (
    <View
      style={{
        width: resolution.width,
        height: resolution.height,
        direction: 'column',
        overflow: 'visible',
      }}>
      {isImage ? (
        <Rescaler style={{ rescaleMode: 'fit' }}>
          <Image imageId={input.imageId!} />
        </Rescaler>
      ) : (
        <Rescaler style={{ rescaleMode: 'fill' }}>
          <InputStream inputId={input.inputId} volume={input.volume} />
        </Rescaler>
      )}
      {input.showTitle !== false && (
        <View
          style={{
            backgroundColor: '#493880',
            height: 40,
            padding: 20,
            borderRadius: 0,
            direction: 'column',
            overflow: 'visible',
            bottom: 0,
            left: 0,
          }}>
          <Text style={{ fontSize: 30, color: 'white' }}>{input.title}</Text>
        </View>
      )}
    </View>
  );

  if (activeShaders.length) {
    return (
      <Rescaler>{wrapWithShaders(smallInputComponent, activeShaders, resolution, 0)}</Rescaler>
    );
  }
  return <Rescaler>{smallInputComponent}</Rescaler>;
}

// Subtitle is sized relative to the input's internal 1920x1080 canvas — same
// canvas the InputStream is rescaled into — so it scales with the input tile
// regardless of where it ends up in the output layout. Padding/font numbers
// are picked to read at the tiniest grid-cell size we actually use.
function Subtitle({
  text,
  parent,
  position = 'bottom',
}: {
  text: string;
  parent: { width: number; height: number };
  position?: 'bottom' | 'top-left';
}) {
  const margin = Math.round(parent.width * 0.04);
  const isTopLeft = position === 'top-left';
  const width = isTopLeft
    ? Math.round(parent.width * 0.35)
    : parent.width - 2 * margin;
  const height = Math.round(parent.height * (isTopLeft ? 0.28 : 0.12));
  return (
    <View
      style={{
        backgroundColor: '#000000CC',
        borderRadius: 16,
        paddingHorizontal: 32,
        left: margin,
        ...(isTopLeft ? { top: margin } : { bottom: margin }),
        width,
        height,
        overflow: 'hidden',
        direction: 'column',
      }}>
      <View />
      <Text
        style={{
          width: width - 64,
          fontSize: isTopLeft ? 36 : 48,
          lineHeight: 60,
          color: '#FFFFFFFF',
          align: 'center',
          wrap: 'word',
        }}>
        {text}
      </Text>
      <View />
    </View>
  );
}


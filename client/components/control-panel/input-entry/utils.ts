import { Input } from '@/app/actions/actions';

export function hasEnabledShader(input: Input): boolean {
  if (!input.shaders) return false;
  return input.shaders.some((shader) => shader.enabled);
}

export function getSourceStateColor(input: Input): string {
  if (input.sourceState === 'live') return 'bg-green-60';
  if (input.sourceState === 'offline') return 'bg-red-60';
  return 'bg-gray-500';
}

export function getSourceStateLabel(input: Input): string {
  if (input.sourceState === 'live') return 'Live';
  if (input.sourceState === 'offline') return 'Offline';
  return 'Unknown';
}

export function getShaderButtonClass(enabled: boolean): string {
  return (
    'ml-4 cursor-pointer transition-all duration-300 rounded ' +
    (enabled
      ? 'bg-gray-800 text-gray-100 hover:bg-gray-700 shadow-md scale-105'
      : 'bg-gray-200 text-gray-900 hover:bg-gray-300')
  );
}

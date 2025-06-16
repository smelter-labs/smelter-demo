import { spawn as nodeSpawn } from 'node:child_process';

export function spawn(command: string, args: string[]) {
  const child = nodeSpawn(command, args, {
    stdio: 'inherit',
  });

  return new Promise<void>((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${command} ${args.join(' ')}" failed with exit code ${code}.`));
      }
    });
  });
}

export function sleep(timeoutMs: number): Promise<void> {
  return new Promise<void>((res) => {
    setTimeout(() => res(), timeoutMs)
  })
}

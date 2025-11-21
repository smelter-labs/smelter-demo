// useDriverTour.ts
import { useEffect, useRef, useCallback } from 'react';
import { driver, type Driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

import '@/components/tour/driver.tour.css';

type UseDriverTourOptions = Parameters<typeof driver>[0];

export type DriverTourOptions = Omit<UseDriverTourOptions, 'steps'>;

export type DriverTourApi = {
  start: () => void;
  reset: () => void;
  stop: () => void;
  highlight: (step: DriveStep) => void;
  next: () => void;
  prev: () => void;
  moveTo: (index: number) => void;

  // warunkowe next/prev
  nextIf: (expectedIndex: number) => void;
  prevIf: (expectedIndex: number) => void;

  instance: Driver | null;
};

export function useDriverTour(
  id: string,
  steps: DriveStep[],
  options: DriverTourOptions = {},
): DriverTourApi {
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    const onResize = () => {
      if (driverRef.current?.isActive?.()) {
        driverRef.current?.refresh?.();
      }
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const start = useCallback(() => {
    // Recreate driver instance on every start to avoid sharing state between tours
    // Local observer state bound to this driver instance
    let resizeObserver: ResizeObserver | null = null;
    let observedElement: Element | null = null;
    let rafId: number | null = null;

    const scheduleRefresh = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        driverRef.current?.refresh?.();
      });
    };

    const attachResizeObserver = (element?: Element) => {
      if (!element) return;
      if (typeof window === 'undefined' || !('ResizeObserver' in window))
        return;
      if (resizeObserver && observedElement === element) return;
      if (resizeObserver && observedElement && observedElement !== element) {
        resizeObserver.unobserve(observedElement);
      }
      if (!resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          if (driverRef.current?.isActive?.()) {
            scheduleRefresh();
          }
        });
      }
      observedElement = element;
      resizeObserver.observe(element);
    };

    const detachResizeObserver = () => {
      if (resizeObserver && observedElement) {
        resizeObserver.unobserve(observedElement);
      }
      observedElement = null;
    };

    const userOnHighlighted = (options as UseDriverTourOptions)?.onHighlighted;
    const userOnDeselected = (options as UseDriverTourOptions)?.onDeselected;
    const userOnPopoverRender = (options as UseDriverTourOptions)
      ?.onPopoverRender;

    const config: UseDriverTourOptions = {
      showProgress: true,
      ...options,
      popoverClass: 'driverjs-theme',
      steps,
      onHighlighted: (element, step, ctx) => {
        attachResizeObserver(element);
        userOnHighlighted?.(element, step, ctx);
      },
      onDeselected: (element, step, ctx) => {
        detachResizeObserver();
        userOnDeselected?.(element, step, ctx);
      },
      onDestroyStarted: () => {
        if (!driverRef.current?.hasNextStep() || confirm('Are you sure?')) {
          driverRef.current?.destroy();
        }
      },
      onPopoverRender: (popover: any, ctx: any) => {
        userOnPopoverRender?.(popover, ctx);
        const { wrapper, footer, progress } = popover;
        if (!wrapper || !footer || !progress) return;
        const totalSteps = steps.length;
        const activeIndex = (ctx?.state?.activeIndex ??
          ctx?.state?.currentStep ??
          0) as number;
        const currentStep = Math.min(Math.max(activeIndex + 1, 1), totalSteps);
        const percent = totalSteps > 1 ? (currentStep / totalSteps) * 100 : 100;
        let container = wrapper.querySelector(
          '.driverjs-progress-container',
        ) as HTMLDivElement | null;
        if (!container) {
          container = document.createElement('div');
          container.className = 'driverjs-progress-container';
          const bar = document.createElement('div');
          bar.className = 'driverjs-progress-bar';
          const barFill = document.createElement('div');
          barFill.className = 'driverjs-progress-bar-fill';
          bar.appendChild(barFill);
          container.appendChild(bar);
          wrapper.insertBefore(container, footer);
        }
        const barFill = container.querySelector(
          '.driverjs-progress-bar-fill',
        ) as HTMLDivElement | null;
        if (barFill) {
          barFill.style.width = `${percent}%`;
        }
      },
    };

    // Ensure previous instance is destroyed
    try {
      driverRef.current?.destroy?.();
    } catch {}

    const d = driver(config);
    driverRef.current = d;
    console.log('start tour', id, driverRef.current, 'steps', steps.length);
    d.drive();
  }, [id]);

  const reset = useCallback(() => {
    driverRef.current?.refresh?.();
  }, []);

  const stop = useCallback(() => {
    driverRef.current?.destroy?.();
  }, []);

  const highlight = useCallback((step: DriveStep) => {
    driverRef.current?.highlight?.(step);
  }, []);

  const next = useCallback(() => {
    driverRef.current?.moveNext?.();
  }, []);

  const prev = useCallback(() => {
    driverRef.current?.movePrevious?.();
  }, []);

  const moveTo = useCallback((index: number) => {
    driverRef.current?.moveTo?.(index);
  }, []);

  const nextIf = useCallback((expectedIndex: number) => {
    const currentIndex = driverRef.current?.getActiveIndex?.();
    if (currentIndex === expectedIndex) {
      driverRef.current?.moveNext?.();
    }
  }, []);

  const prevIf = useCallback((expectedIndex: number) => {
    const currentIndex = driverRef.current?.getActiveIndex?.();
    if (currentIndex === expectedIndex) {
      driverRef.current?.movePrevious?.();
    }
  }, []);

  return {
    start,
    reset,
    stop,
    highlight,
    next,
    prev,
    moveTo,
    nextIf,
    prevIf,
    instance: driverRef.current,
  };
}

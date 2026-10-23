/**
 * Shared visibility-aware poll scheduler (PERFORMANCE_OPTIMIZATION_PLAN.md
 * Phase 2). One scheduler per dataset, ref-counted across hook instances: the
 * first subscriber starts it, the last one stops it. Cycles never overlap (a
 * tick is skipped while the previous run is still in flight) and the interval
 * stretches while the tab is hidden.
 */
export interface PollSchedulerOptions {
  intervalMs: number;
  hiddenIntervalMs?: number;
  /** Run one cycle immediately on start. Defaults to true. */
  immediate?: boolean;
}

export interface PollScheduler {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

export function createPollScheduler(
  run: () => Promise<unknown> | unknown,
  options: PollSchedulerOptions
): PollScheduler {
  const hiddenIntervalMs = options.hiddenIntervalMs ?? options.intervalMs * 3;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let refs = 0;
  let inFlight = false;

  const currentDelay = () =>
    typeof document !== 'undefined' && document.hidden ? hiddenIntervalMs : options.intervalMs;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = (delay: number) => {
    clearTimer();
    timer = setTimeout(tick, delay);
  };

  const tick = () => {
    if (refs === 0) return;
    if (inFlight) {
      // A slow cycle must not stack requests: reschedule without overlapping.
      schedule(currentDelay());
      return;
    }
    inFlight = true;
    Promise.resolve()
      .then(run)
      .catch(() => undefined)
      .finally(() => {
        inFlight = false;
        if (refs > 0) schedule(currentDelay());
      });
  };

  const onVisibilityChange = () => {
    if (refs === 0 || inFlight) return;
    if (typeof document !== 'undefined' && !document.hidden) {
      // Coming back to the tab: refresh shortly instead of waiting out the
      // hidden back-off window.
      schedule(250);
    }
  };

  return {
    start() {
      refs += 1;
      if (refs > 1) return;
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibilityChange);
      }
      if (options.immediate === false) schedule(currentDelay());
      else tick();
    },
    stop() {
      refs = Math.max(0, refs - 1);
      if (refs > 0) return;
      clearTimer();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    },
    isRunning: () => refs > 0,
  };
}

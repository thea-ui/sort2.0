import { describe, expect, it } from 'vitest';

import {
  isInstallModeActionable,
  isIosDevice,
  isIosSafari,
  resolveInstallMode,
  type InstallEnvironment,
} from '../installMode';

const base: InstallEnvironment = {
  standalone: false,
  hasPrompt: false,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36',
  platform: 'Win32',
  maxTouchPoints: 0,
};

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';

describe('resolveInstallMode', () => {
  it('reports installed in standalone mode', () => {
    expect(resolveInstallMode({ ...base, standalone: true, hasPrompt: true })).toBe('installed');
  });

  it('reports prompt when the browser captured an install event', () => {
    expect(resolveInstallMode({ ...base, hasPrompt: true })).toBe('prompt');
  });

  it('uses manual instructions on iOS Safari', () => {
    const env = { ...base, userAgent: IPHONE_SAFARI, platform: 'iPhone', maxTouchPoints: 5 };
    expect(isIosDevice(env)).toBe(true);
    expect(isIosSafari(env)).toBe(true);
    expect(resolveInstallMode(env)).toBe('ios-manual');
  });

  it('tells iOS third-party browsers to switch to Safari', () => {
    const env = { ...base, userAgent: IPHONE_CHROME, platform: 'iPhone', maxTouchPoints: 5 };
    expect(isIosSafari(env)).toBe(false);
    expect(resolveInstallMode(env)).toBe('ios-other-browser');
  });

  it('detects iPadOS desktop user agents', () => {
    const env = {
      ...base,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    };
    expect(isIosDevice(env)).toBe(true);
    expect(resolveInstallMode(env)).toBe('ios-manual');
  });

  it('reports unsupported on desktop browsers without a prompt', () => {
    expect(resolveInstallMode(base)).toBe('unsupported');
    const firefox = { ...base, userAgent: 'Mozilla/5.0 Firefox/130.0' };
    expect(resolveInstallMode(firefox)).toBe('unsupported');
  });

  it('only prompt and iOS manual modes are actionable', () => {
    expect(isInstallModeActionable('prompt')).toBe(true);
    expect(isInstallModeActionable('ios-manual')).toBe(true);
    expect(isInstallModeActionable('ios-other-browser')).toBe(true);
    expect(isInstallModeActionable('installed')).toBe(false);
    expect(isInstallModeActionable('unsupported')).toBe(false);
  });
});

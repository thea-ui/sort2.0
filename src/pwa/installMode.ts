/**
 * Pure install-mode resolver. Kept DOM-free so it can be unit-tested in the
 * node Vitest environment and reused by the provider.
 */

export type InstallMode =
  | 'installed'
  | 'prompt'
  | 'ios-manual'
  | 'ios-other-browser'
  | 'unsupported';

export interface InstallEnvironment {
  standalone: boolean;
  hasPrompt: boolean;
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
}

const IOS_USER_AGENT = /iPad|iPhone|iPod/;
const IOS_NON_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|GSA/;

export function isIosDevice(env: InstallEnvironment): boolean {
  if (IOS_USER_AGENT.test(env.userAgent)) return true;
  // iPadOS 13+ reports a desktop Safari user agent.
  return env.platform === 'MacIntel' && (env.maxTouchPoints ?? 0) > 1;
}

export function isIosSafari(env: InstallEnvironment): boolean {
  if (!isIosDevice(env)) return false;
  if (IOS_NON_SAFARI.test(env.userAgent)) return false;
  return /Safari/.test(env.userAgent);
}

export function resolveInstallMode(env: InstallEnvironment): InstallMode {
  if (env.standalone) return 'installed';
  if (env.hasPrompt) return 'prompt';
  if (isIosDevice(env)) return isIosSafari(env) ? 'ios-manual' : 'ios-other-browser';
  return 'unsupported';
}

export function isInstallModeActionable(mode: InstallMode): boolean {
  return mode === 'prompt' || mode === 'ios-manual' || mode === 'ios-other-browser';
}

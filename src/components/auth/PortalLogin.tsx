import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { useMockData } from '../../hooks/useMockData';
import { useTheme } from '../../hooks/useTheme';
import { SortLogo } from '../common/SortLogo';
import { getLoginErrorMessage, ROLE_PORTAL_MESSAGE } from '../../utils/loginErrors';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormBanner } from '../common/InlineBanner';
import { OfflineLoginNotice } from './OfflineAuthNotice';
import { PixelGridBackground, PIXEL_GRID_WASH } from '../layout/PixelGridBackground';
import { CARD_SHADOW } from '../ui/Card';

export type StaffPortal = 'ADMIN' | 'MRF';

const REMEMBERED_ID_KEY = 'sortv2_remembered_identifier';

export interface PortalFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface PortalLoginConfig {
  /** Role this terminal admits; other roles get the wrong-portal notice. */
  portal: StaffPortal;
  /** Short badge next to the wordmark, e.g. `ADMIN`. */
  badge: string;
  /** Badge tint — amber for admin, emerald for MRF. */
  badgeClassName: string;
  /** Descriptor under the wordmark, e.g. `System Administration Portal`. */
  portalTitle: string;
  /** Glyph shown on the primary action. */
  signInIcon: LucideIcon;
  footerIcon: LucideIcon;
  footerText: string;
  /** Four capability bullets on the brand panel. */
  features: PortalFeature[];
}

interface PortalLoginProps {
  config: PortalLoginConfig;
  onNavigate: (route: string) => void;
}

/**
 * Staff sign-in screen shared by the Admin console and the MRF terminal.
 *
 * Mirror of the SMART portal login (split brand panel + form panel) rebuilt from
 * SORT's design system: semantic surface tokens, the shell's pixel-grid backdrop,
 * hero-height fields (44px) with icon tiles, and the tenant brand
 * (`--theme-primary`) for the panel and primary action — never a hardcoded hex.
 */
export const PortalLogin: React.FC<PortalLoginProps> = ({ config, onNavigate }) => {
  const { login } = useMockData();
  const { schoolName, address } = useTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // "Remember me" remembers the Employee ID on this device only — never the
  // password and never the session (auth flow/API contract unchanged).
  useEffect(() => {
    const stored = localStorage.getItem(REMEMBERED_ID_KEY);
    if (stored) {
      setIdentifier(stored);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Employee ID and password are required.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await login(password, identifier);
      setLoading(false);
      if (result.ok) {
        if (result.user.role !== config.portal) {
          setErrorMsg(ROLE_PORTAL_MESSAGE);
        } else {
          if (remember) localStorage.setItem(REMEMBERED_ID_KEY, identifier.trim());
          else localStorage.removeItem(REMEMBERED_ID_KEY);
          onNavigate('dashboard');
        }
      } else {
        setErrorMsg(getLoginErrorMessage(result.code, result.message));
      }
    } catch {
      setLoading(false);
      setErrorMsg('Authentication failed.');
    }
  };

  const { signInIcon: SignInIcon, footerIcon: FooterIcon } = config;

  const brandHeader = (
    <div className="flex items-center gap-2">
      <span className="text-4xl font-bold tracking-tight text-white">SORT</span>
      <span className={`px-2 py-0.5 text-xs font-bold rounded text-white shadow-sm ${config.badgeClassName}`}>
        {config.badge}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc', backgroundImage: PIXEL_GRID_WASH }}>
      {/* ── Brand panel (lg and up) ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-3/5 relative overflow-hidden bg-[var(--theme-primary)] shrink-0">
        <div className="relative z-10 flex flex-col justify-center py-12 xl:py-16 px-12 xl:px-20 text-white w-full h-full">
          <div className="mb-6">
            {brandHeader}
            <p className="text-white text-sm font-bold max-w-md mt-1">{config.portalTitle}</p>
          </div>

          <div className="space-y-3 mb-6">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">
              {schoolName || 'SORT'}
            </h1>
            {address && <p className="text-white text-sm font-bold">{address}</p>}
            <div className="flex flex-col gap-1.5 mt-3">
              <p className="text-white text-sm font-bold">
                DepEd Public School Waste Reporting and Recovery Tracking Portal
              </p>
            </div>
          </div>

          <div className="grid gap-2.5 max-w-xl">
            {config.features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 group transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{title}</h3>
                  <p className="text-white text-sm font-semibold">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-12 xl:left-20 flex items-center gap-3 text-white/50 text-sm">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <FooterIcon className="w-4 h-4 text-white" />
          </div>
          <span>{config.footerText}</span>
        </div>
      </div>

      {/* ── Form panel ──────────────────────────────────────────────────────── */}
      <div className="relative w-full lg:w-[45%] xl:w-2/5 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <PixelGridBackground position="absolute" wash={false} />

        <div className="relative z-10 w-full max-w-[420px]">
          {/* Mobile brand header — the brand panel is hidden below lg */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg overflow-hidden bg-card border border-border shrink-0">
              <SortLogo size={32} showText={false} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-foreground">SORT</span>
                <span className={`px-2 py-0.5 text-xs font-bold rounded text-white ${config.badgeClassName}`}>
                  {config.badge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{schoolName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Landing
          </button>

          <div className={`bg-card border border-border rounded-2xl overflow-hidden ${CARD_SHADOW}`}>
            <div className="flex flex-col items-center space-y-1 text-center px-8 pt-8">
              <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg overflow-hidden bg-card border border-border">
                <SortLogo size={40} showText={false} />
              </div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight pt-2">Welcome Back</h2>
              <p className="tracking-wide uppercase text-muted-foreground text-sm font-normal mt-1 leading-relaxed">
                Sign in to your {config.badge.toLowerCase()} account to manage{' '}
                <span className="font-semibold text-primary">SORT</span>
              </p>
            </div>

            <div className="px-8 pb-8 pt-4">
              <OfflineLoginNotice />
              {errorMsg && <FormBanner variant="error" title={errorMsg} />}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="portal-identifier" className="text-sm font-medium text-foreground">
                    Employee ID
                  </label>
                  <div className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none z-10">
                      <div className="w-8 h-8 rounded-lg bg-muted group-focus-within:bg-border flex items-center justify-center transition-colors duration-200">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <Input
                      id="portal-identifier"
                      name="identifier"
                      type="text"
                      required
                      autoFocus
                      autoComplete="username"
                      placeholder="Enter Employee ID"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="h-11 rounded-xl bg-card pl-12"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="portal-password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none z-10">
                      <div className="w-8 h-8 rounded-lg bg-muted group-focus-within:bg-border flex items-center justify-center transition-colors duration-200">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <Input
                      id="portal-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl bg-card pl-12 pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm py-1">
                  <label className="flex items-center gap-2 cursor-pointer group select-none">
                    <span className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        aria-label="Remember me"
                        className="peer h-4 w-4 appearance-none rounded border border-border bg-card checked:bg-primary checked:border-primary transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      <svg
                        className="pointer-events-none absolute w-2.5 h-2.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity duration-150"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium text-sm">
                      Remember me
                    </span>
                  </label>
                  <span className="text-xs font-medium text-muted-foreground select-none">
                    Contact System Admin
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl font-semibold hover:opacity-95 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.99] transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <SignInIcon />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              <p className="text-[11px] text-muted-foreground text-center mt-4 leading-relaxed">
                By signing in, you agree to our <span className="text-primary">Terms</span> and{' '}
                <span className="text-primary">Privacy Policy</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

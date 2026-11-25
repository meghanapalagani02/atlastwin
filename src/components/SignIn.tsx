import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Network,
  Route,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  UserRole,
  UserSession,
  deriveDisplayNameFromEmail,
  deriveInitials,
} from '../types/auth';
import { AtlasLogo } from './AtlasLogo';
import { NetworkMeshBackground } from './NetworkMeshBackground';

interface SignInProps {
  initialRememberedEmail?: string;
  initialRememberedRole?: UserRole;
  onAuthenticated: (session: UserSession, rememberMe: boolean) => void;
}

const ROLES: UserRole[] = ['CISO', 'Security Analyst', 'Auditor'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SignIn: React.FC<SignInProps> = ({
  initialRememberedEmail = '',
  initialRememberedRole = 'CISO',
  onAuthenticated,
}) => {
  const [role, setRole] = useState<UserRole>(initialRememberedRole);
  const [email, setEmail] = useState(initialRememberedEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(Boolean(initialRememberedEmail));

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [shakeCard, setShakeCard] = useState(false);

  const [submitting, setSubmitting] = useState<
    null | 'password' | 'sso' | 'hardware-key'
  >(null);

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const triggerShake = () => {
    setShakeCard(false);
    window.requestAnimationFrame(() => {
      setShakeCard(true);
      window.setTimeout(() => setShakeCard(false), 420);
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    let hasErr = false;

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Enter a valid corporate email address.');
      hasErr = true;
    } else {
      setEmailError(null);
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      hasErr = true;
    } else {
      setPasswordError(null);
    }

    if (hasErr) {
      triggerShake();
      return;
    }

    setSubmitting('password');
    const name = deriveDisplayNameFromEmail(trimmedEmail);
    window.setTimeout(() => {
      onAuthenticated(
        {
          name,
          email: trimmedEmail,
          role,
          initials: deriveInitials(name),
          authMethod: 'password',
        },
        rememberMe
      );
    }, 550);
  };

  const handleAltAuth = (method: 'sso' | 'hardware-key') => {
    if (submitting) return;
    setEmailError(null);
    setPasswordError(null);
    setSubmitting(method);

    const activeEmail = EMAIL_REGEX.test(email.trim())
      ? email.trim()
      : method === 'sso'
        ? 'sso.operator@atlasbank.internal'
        : 'hw.security@atlasbank.internal';
    const name = EMAIL_REGEX.test(email.trim())
      ? deriveDisplayNameFromEmail(email.trim())
      : method === 'sso'
        ? 'Elena Vance'
        : 'Marcus Thorne';

    window.setTimeout(() => {
      onAuthenticated(
        {
          name,
          email: activeEmail,
          role,
          initials: deriveInitials(name),
          authMethod: method,
        },
        rememberMe
      );
    }, 1200);
  };

  const handleDemoAccess = () => {
    if (submitting) return;
    onAuthenticated(
      {
        name: 'Demo Analyst',
        email: 'demo.analyst@atlasbank.internal',
        role: 'Security Analyst',
        initials: 'DA',
        authMethod: 'demo',
      },
      false
    );
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(forgotEmail.trim())) {
      setForgotError('Enter a valid email address.');
      return;
    }
    setForgotError(null);
    setForgotSuccess(true);
  };

  const emailFloat = emailFocused || email.length > 0;
  const passwordFloat = passwordFocused || password.length > 0;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FAF7F0] animate-fade-in-smooth">
      {/* LEFT PANEL (55%): Deep Atlas Navy */}
      <section className="relative lg:w-[55%] bg-[#0B1F3A] text-[#FAF7F0] px-6 sm:px-12 py-10 lg:py-14 flex flex-col justify-between overflow-hidden">
        <NetworkMeshBackground density={26} />

        <div className="relative z-10 max-w-xl mx-auto lg:mx-0 w-full">
          <AtlasLogo size="lg" variant="ivory" />

          <h1 className="mt-8 font-display text-3xl sm:text-4xl font-bold leading-tight text-[#FAF7F0]">
            Continuous attack-path intelligence for financial networks
          </h1>

          {/* 3 Feature Rows */}
          <ul className="mt-7 space-y-4">
            <li className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#1B3358] border border-[#C9A227]/40 flex items-center justify-center shrink-0 mt-0.5">
                <Network className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#FAF7F0]">
                  Live digital twin of your bank network
                </div>
                <div className="text-xs text-[#E6D49A]/75 mt-0.5">
                  Segmented zone topology across DMZ, Core Banking, Data, and SWIFT payment rails.
                </div>
              </div>
            </li>

            <li className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#1B3358] border border-[#C9A227]/40 flex items-center justify-center shrink-0 mt-0.5">
                <Route className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#FAF7F0]">
                  Ranked attack paths to crown-jewel assets
                </div>
                <div className="text-xs text-[#E6D49A]/75 mt-0.5">
                  Real-time k-shortest-path likelihood scoring and choke-point discovery.
                </div>
              </div>
            </li>

            <li className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#1B3358] border border-[#C9A227]/40 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-[#C9A227]" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#FAF7F0]">
                  What-if patch simulation in seconds
                </div>
                <div className="text-xs text-[#E6D49A]/75 mt-0.5">
                  Verify cumulative risk reduction before scheduling production maintenance windows.
                </div>
              </div>
            </li>
          </ul>

          {/* Mini Live Preview (purely decorative animated graph with pulsing gold path) */}
          <div
            aria-hidden="true"
            className="mt-8 bg-[#1B3358]/65 border border-[#C9A227]/35 rounded-xl p-4"
          >
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#E6D49A]/85 mb-2">
              <span>Topology Preview · Active Path Trace</span>
              <span>DMZ → Core → SWIFT</span>
            </div>
            <svg viewBox="0 0 420 92" className="w-full h-20 overflow-visible">
              {/* Baseline edges */}
              <g stroke="rgba(250,247,240,0.18)" strokeWidth="1.2" fill="none">
                <path d="M28,46 L112,22" />
                <path d="M28,46 L112,70" />
                <path d="M112,22 L208,46" />
                <path d="M112,70 L208,46" />
                <path d="M208,46 L300,22" />
                <path d="M208,46 L300,70" />
                <path d="M300,22 L392,46" />
                <path d="M300,70 L392,46" />
              </g>
              {/* Animated gold path */}
              <path
                d="M28,46 L112,22 L208,46 L300,22 L392,46"
                fill="none"
                stroke="#C9A227"
                strokeWidth="2.2"
                strokeDasharray="7 5"
                className="animate-gold-flow"
              />
              {/* Nodes */}
              {[
                { cx: 28, cy: 46, gold: true },
                { cx: 112, cy: 22, gold: true },
                { cx: 112, cy: 70, gold: false },
                { cx: 208, cy: 46, gold: true },
                { cx: 300, cy: 22, gold: true },
                { cx: 300, cy: 70, gold: false },
              ].map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.cx}
                  cy={pt.cy}
                  r={pt.gold ? 5.5 : 4.5}
                  fill="#0B1F3A"
                  stroke={pt.gold ? '#C9A227' : 'rgba(250,247,240,0.45)'}
                  strokeWidth="2"
                />
              ))}
              {/* Crown Jewel Target */}
              <circle
                cx="392"
                cy="46"
                r="10"
                fill="none"
                stroke="#C9A227"
                strokeWidth="1.5"
                className="animate-gold-pulse-ring"
              />
              <circle
                cx="392"
                cy="46"
                r="6.5"
                fill="#1B3358"
                stroke="#C9A227"
                strokeWidth="2.2"
              />
            </svg>
          </div>
        </div>

        {/* Bottom Trust Strip */}
        <div className="relative z-10 max-w-xl mx-auto lg:mx-0 w-full mt-8 pt-6 border-t border-[#C9A227]/20 flex flex-wrap items-center gap-2.5">
          {['NVD Live Data', 'MITRE ATT&CK Mapped', 'Zero Agent Install'].map((badge) => (
            <span
              key={badge}
              className="px-3 py-1 rounded-md border border-[#E6D49A]/45 text-[11px] font-mono text-[#E6D49A] bg-[#1B3358]/50"
            >
              {badge}
            </span>
          ))}
        </div>
      </section>

      {/* RIGHT PANEL (45%): Ivory Sign-In Card */}
      <section className="lg:w-[45%] bg-[#FAF7F0] px-5 sm:px-10 py-10 flex flex-col items-center justify-center">
        <div className="w-full max-w-[430px]">
          <div
            className={`bg-[#F1ECDD] border border-[#E6D49A] rounded-2xl shadow-lg p-6 sm:p-8 ${
              shakeCard ? 'animate-shake' : ''
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center gap-3 mb-5">
              <AtlasLogo size="sm" variant="navy" iconOnly />
              <div>
                <h2 className="font-display text-2xl font-bold text-[#0B1F3A] leading-tight">
                  Welcome back
                </h2>
                <p className="text-xs text-[#0B1F3A]/70 mt-0.5">
                  Sign in to your security operations workspace
                </p>
              </div>
            </div>

            {/* Role Selector Segmented Pills */}
            <div className="mb-5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#0B1F3A]/75 mb-2">
                Operator Role
              </span>
              <div
                role="radiogroup"
                aria-label="Select operator role"
                className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF7F0] border border-[#E6D49A] rounded-xl"
              >
                {ROLES.map((r) => {
                  const active = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setRole(r)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${
                        active
                          ? 'bg-[#C9A227] text-[#0B1F3A] shadow-xs'
                          : 'text-[#0B1F3A]/75 hover:text-[#0B1F3A] hover:bg-[#F1ECDD]/60'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
              {/* Email Input with Floating Label */}
              <div>
                <div className="relative">
                  <Mail
                    className="w-4 h-4 text-[#0B1F3A]/55 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    aria-invalid={Boolean(emailError)}
                    aria-describedby={emailError ? 'signin-email-error' : undefined}
                    className={`w-full bg-[#FAF7F0] text-[#0B1F3A] text-sm rounded-xl pl-10 pr-4 pt-5 pb-2 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C9A227] ${
                      emailError ? 'border-[#B3261E]' : 'border-[#E6D49A]'
                    }`}
                  />
                  <label
                    htmlFor="signin-email"
                    className={`absolute left-10 pointer-events-none transition-all duration-200 ${
                      emailFloat
                        ? 'top-1.5 text-[10px] font-semibold text-[#0B1F3A]/70'
                        : 'top-1/2 -translate-y-1/2 text-xs text-[#0B1F3A]/60'
                    }`}
                  >
                    Corporate Email
                  </label>
                </div>
                {emailError && (
                  <p id="signin-email-error" className="mt-1 text-[11px] font-medium text-[#B3261E]">
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password Input with Floating Label & Eye Toggle */}
              <div>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-[#0B1F3A]/55 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    aria-invalid={Boolean(passwordError)}
                    aria-describedby={passwordError ? 'signin-password-error' : undefined}
                    className={`w-full bg-[#FAF7F0] text-[#0B1F3A] text-sm rounded-xl pl-10 pr-11 pt-5 pb-2 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C9A227] ${
                      passwordError ? 'border-[#B3261E]' : 'border-[#E6D49A]'
                    }`}
                  />
                  <label
                    htmlFor="signin-password"
                    className={`absolute left-10 pointer-events-none transition-all duration-200 ${
                      passwordFloat
                        ? 'top-1.5 text-[10px] font-semibold text-[#0B1F3A]/70'
                        : 'top-1/2 -translate-y-1/2 text-xs text-[#0B1F3A]/60'
                    }`}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-[#0B1F3A]/60 hover:text-[#0B1F3A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p id="signin-password-error" className="mt-1 text-[11px] font-medium text-[#B3261E]">
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="inline-flex items-center gap-2 text-[#0B1F3A]/85 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-[#0B1F3A] rounded cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotError(null);
                    setForgotSuccess(false);
                    setForgotOpen(true);
                  }}
                  className="font-medium text-[#0B1F3A] hover:text-[#9A7A14] underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={submitting !== null}
                className="w-full py-3 px-4 rounded-xl bg-[#0B1F3A] text-[#C9A227] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#1B3358] hover:shadow-[0_0_20px_rgba(201,162,39,0.32)] transition-all duration-200 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
              >
                {submitting === 'password' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E6D49A]" />
              <span className="text-[11px] text-[#0B1F3A]/60 whitespace-nowrap">
                or continue with
              </span>
              <div className="flex-1 h-px bg-[#E6D49A]" />
            </div>

            {/* SSO & Hardware Key */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleAltAuth('sso')}
                className="py-2.5 px-3 rounded-xl bg-[#FAF7F0] border border-[#E6D49A] hover:border-[#C9A227] text-[#0B1F3A] text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                {submitting === 'sso' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A227]" aria-hidden="true" />
                    <span>Verifying SSO...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                    <span>Single Sign-On (SSO)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleAltAuth('hardware-key')}
                className="py-2.5 px-3 rounded-xl bg-[#FAF7F0] border border-[#E6D49A] hover:border-[#C9A227] text-[#0B1F3A] text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                {submitting === 'hardware-key' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A227]" aria-hidden="true" />
                    <span>Reading token...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
                    <span>Hardware Key</span>
                  </>
                )}
              </button>
            </div>

            {/* Instant Demo Workspace CTA */}
            <button
              type="button"
              disabled={submitting !== null}
              onClick={handleDemoAccess}
              className="mt-3 w-full py-2.5 px-4 rounded-xl bg-[#C9A227] text-[#0B1F3A] hover:bg-[#d8b43b] font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all duration-200 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F3A]"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Explore Demo Workspace</span>
            </button>

            <p className="mt-4 text-center text-[11px] text-[#0B1F3A]/65 leading-relaxed">
              Protected by simulated MFA. Demo environment, no real credentials are stored.
            </p>
          </div>

          {/* Hint under the card */}
          <p className="mt-3 text-center text-xs text-[#0B1F3A]/70">
            Tip: use the <span className="font-semibold text-[#0B1F3A]">Explore Demo Workspace</span> button for instant access
          </p>
        </div>
      </section>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          className="fixed inset-0 z-50 bg-[#0B1F3A]/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-[#FAF7F0] border border-[#C9A227] rounded-2xl p-6 shadow-2xl animate-fade-in-smooth">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="forgot-modal-title" className="font-display text-lg font-bold text-[#0B1F3A]">
                  Reset Operator Access
                </h3>
                <p className="text-xs text-[#0B1F3A]/70 mt-1">
                  Enter your institutional email to simulate a password recovery dispatch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                aria-label="Close password recovery dialog"
                className="p-1.5 rounded-lg text-[#0B1F3A]/70 hover:bg-[#F1ECDD] hover:text-[#0B1F3A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="mt-5 bg-[#5E8C61]/10 border border-[#5E8C61]/40 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#5E8C61] shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs text-[#0B1F3A] leading-relaxed">
                  <div className="font-semibold">Simulated recovery link dispatched</div>
                  <div className="mt-1 text-[#0B1F3A]/75">
                    If an operator account exists for{' '}
                    <span className="font-mono">{forgotEmail}</span>, reset instructions have
                    been logged for security review.
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} noValidate className="mt-5 space-y-3">
                <div>
                  <label
                    htmlFor="forgot-email-input"
                    className="block text-xs font-semibold text-[#0B1F3A] mb-1.5"
                  >
                    Corporate Email
                  </label>
                  <input
                    id="forgot-email-input"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotError) setForgotError(null);
                    }}
                    placeholder="analyst@atlasbank.com"
                    className="w-full bg-[#F1ECDD] border border-[#E6D49A] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  />
                  {forgotError && (
                    <p className="mt-1 text-[11px] font-medium text-[#B3261E]">{forgotError}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-[#0B1F3A] bg-[#F1ECDD] border border-[#E6D49A] hover:border-[#0B1F3A] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B1F3A] text-[#C9A227] hover:bg-[#1B3358] cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

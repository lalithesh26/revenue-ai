import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  HelpCircle,
  X,
  User as UserIcon,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

interface SignInPageProps {
  onLoginSuccess: (user: User) => void;
}

type AuthTab = 'signin' | 'register';

/* ─── Tiny Google "G" SVG icon ────────────────────────────────── */
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

/* ─── Password strength indicator ─────────────────────────────── */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#EF4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#F59E0B' };
  if (score <= 3) return { score, label: 'Good', color: '#3B82F6' };
  return { score, label: 'Strong', color: '#10B981' };
}

/* ─── Google OAuth popup helper (sandbox: inline mock) ────────── */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          prompt: () => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
  }
}

export const SignInPage: React.FC<SignInPageProps> = ({ onLoginSuccess }) => {
  const [tab, setTab] = useState<AuthTab>('signin');

  // Sign-in state
  const [email, setEmail] = useState('demo@revenueai.app');
  const [password, setPassword] = useState('RevenueAI@2026');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regShowPw, setRegShowPw] = useState(false);
  const [regRemember, setRegRemember] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const pwStrength = getPasswordStrength(regPassword);

  /* ── Load Google Identity Services script ── */
  useEffect(() => {
    const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
    if (!GOOGLE_CLIENT_ID) return; // Skip if no client ID configured


    const existing = document.getElementById('google-gsi-script');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      });
    };
    document.head.appendChild(script);
  }, []);

  const handleGoogleCredential = useCallback(
    async (response: { credential: string }) => {
      try {
        setGoogleLoading(true);
        setError(null);
        const res = await api.googleSignIn(response.credential, true);
        setSuccess(`Welcome, ${res.user.name}! Signing you in…`);
        setTimeout(() => onLoginSuccess(res.user), 600);
      } catch (err: any) {
        setError(err.message || 'Google sign-in failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    [onLoginSuccess]
  );

  /* ── Sandbox Google mock: generates a fake JWT payload ── */
  const handleSandboxGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      // Build a mock Google ID token (unsigned, sandbox only)
      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const payload = btoa(
        JSON.stringify({
          sub: 'google_sandbox_' + Date.now(),
          email: 'google.user@gmail.com',
          name: 'Google User',
          given_name: 'Google',
          picture: 'https://lh3.googleusercontent.com/a/placeholder',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      );
      const fakeToken = `${header}.${payload}.sandbox_sig`;
      const res = await api.googleSignIn(fakeToken, true);
      setSuccess(`Welcome, ${res.user.name}! Signing you in…`);
      setTimeout(() => onLoginSuccess(res.user), 600);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRealGoogle = () => {
    const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
    if (GOOGLE_CLIENT_ID && window.google) {
      window.google.accounts.id.prompt();
    } else {
      handleSandboxGoogle();
    }
  };


  /* ── Sign-in submit ── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.login(email.trim(), password, rememberMe);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Register submit ── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (regPassword !== regConfirm) {
      setError('Passwords do not match.');
      return;
    }
    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.register(regName.trim(), regEmail.trim(), regPassword, regRemember);
      setSuccess(`Account created! Welcome, ${res.user.name} 🎉`);
      setTimeout(() => onLoginSuccess(res.user), 700);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@revenueai.app');
    setPassword('RevenueAI@2026');
    setError(null);
  };

  /* ── Helpers ── */
  const switchTab = (t: AuthTab) => {
    setTab(t);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Ambient gradients */}
      <div className="absolute top-0 left-1/4 w-[480px] h-[480px] bg-indigo-200/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[480px] h-[480px] bg-purple-200/20 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6366F1] via-[#7C3AED] to-[#A855F7] shadow-xl shadow-indigo-500/20 text-white transform hover:scale-105 transition-transform duration-200">
            <span className="font-extrabold text-2xl tracking-tight">R</span>
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
              RevenueAI
            </h1>
            <p className="text-xs font-bold text-[#8B5CF6] tracking-wider uppercase">
              AI Revenue Recovery
            </p>
          </div>
          <p className="text-xs text-[#64748B] max-w-xs pt-1">
            {tab === 'signin'
              ? 'Sign in to your workspace to monitor recovery cases and autonomous workflows.'
              : 'Create a new account to get started with AI-powered revenue recovery.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#ECEEF2] rounded-3xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">

          {/* Tab Bar */}
          <div className="flex border-b border-[#ECEEF2]">
            <button
              onClick={() => switchTab('signin')}
              className={`flex-1 py-3.5 text-xs font-bold transition-colors ${
                tab === 'signin'
                  ? 'text-[#6366F1] border-b-2 border-[#6366F1] bg-[#F5F3FF]/60'
                  : 'text-[#94A3B8] hover:text-[#475569]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-3.5 text-xs font-bold transition-colors ${
                tab === 'register'
                  ? 'text-[#6366F1] border-b-2 border-[#6366F1] bg-[#F5F3FF]/60'
                  : 'text-[#94A3B8] hover:text-[#475569]'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="p-7 sm:p-8 space-y-5">
            {/* Success Banner */}
            {success && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] p-3.5 text-xs text-[#059669]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] p-3.5 text-xs text-[#E11D48]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* ─── Google Button ─── */}
            <button
              type="button"
              onClick={handleRealGoogle}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#CBD5E1] text-[#0F172A] font-semibold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {googleLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-[#6366F1]/30 border-t-[#6366F1] rounded-full animate-spin" />
                  <span>Connecting to Google…</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E2E8F0]" />
              <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-[#E2E8F0]" />
            </div>

            {/* ══════════════════ SIGN IN FORM ══════════════════ */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#334155]">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                    <input
                      id="signin-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@company.com"
                      className="w-full rounded-2xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#334155]">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-2xl border border-[#E2E8F0] bg-white pl-10 pr-10 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded-lg border-[#CBD5E1] text-[#6366F1] focus:ring-[#6366F1]/20 h-4 w-4 cursor-pointer"
                    />
                    <span className="text-[#475569] font-medium">Remember for 7 days</span>
                  </label>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#10B981]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    PBKDF2 Encrypted
                  </span>
                </div>

                <button
                  id="signin-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white font-bold text-xs shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ══════════════════ REGISTER FORM ══════════════════ */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#334155]">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                    <input
                      id="register-name"
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Alex Johnson"
                      className="w-full rounded-2xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#334155]">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                    <input
                      id="register-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="alex@company.com"
                      className="w-full rounded-2xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#334155]">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                    <input
                      id="register-password"
                      type={regShowPw ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full rounded-2xl border border-[#E2E8F0] bg-white pl-10 pr-10 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setRegShowPw(!regShowPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                    >
                      {regShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {regPassword && (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor: i <= pwStrength.score ? pwStrength.color : '#E2E8F0',
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] font-semibold" style={{ color: pwStrength.color }}>
                        {pwStrength.label} password
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#334155]">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                    <input
                      id="register-confirm"
                      type="password"
                      required
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full rounded-2xl border bg-white pl-10 pr-10 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] shadow-sm focus:outline-none focus:ring-2 transition-all font-medium ${
                        regConfirm && regConfirm !== regPassword
                          ? 'border-[#FCA5A5] focus:border-[#EF4444] focus:ring-[#EF4444]/10'
                          : 'border-[#E2E8F0] focus:border-[#6366F1] focus:ring-[#6366F1]/10'
                      }`}
                    />
                    {regConfirm && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        {regConfirm === regPassword ? (
                          <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                        ) : (
                          <X className="h-4 w-4 text-[#EF4444]" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Remember me */}
                <div className="flex items-center gap-2 text-xs pt-1">
                  <input
                    type="checkbox"
                    id="reg-remember"
                    checked={regRemember}
                    onChange={(e) => setRegRemember(e.target.checked)}
                    className="rounded-lg border-[#CBD5E1] text-[#6366F1] focus:ring-[#6366F1]/20 h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="reg-remember" className="text-[#475569] font-medium cursor-pointer select-none">
                    Remember me for 7 days
                  </label>
                </div>

                {/* Terms note */}
                <p className="text-[10px] text-[#94A3B8] leading-relaxed">
                  By creating an account you agree to our{' '}
                  <span className="text-[#6366F1] font-semibold cursor-pointer hover:underline">Terms of Service</span>
                  {' '}and{' '}
                  <span className="text-[#6366F1] font-semibold cursor-pointer hover:underline">Privacy Policy</span>.
                </p>

                <button
                  id="register-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white font-bold text-xs shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── Demo Credentials Pill (sign-in tab only) ── */}
            {tab === 'signin' && (
              <div className="pt-1 border-t border-[#ECEEF2]">
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F1F5F9] transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] font-bold text-xs group-hover:scale-110 transition-transform">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-[#0F172A] flex items-center gap-1.5">
                        <span>Fill Demo Credentials</span>
                        <span className="rounded-full bg-[#ECFDF5] text-[#059669] font-mono text-[9px] px-1.5 border border-[#A7F3D0]">
                          Admin
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-[#64748B]">
                        demo@revenueai.app · RevenueAI@2026
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#6366F1] group-hover:translate-x-0.5 transition-transform">
                    Fill →
                  </span>
                </button>
              </div>
            )}

            {/* ── Switch tab link ── */}
            {tab === 'register' && (
              <p className="text-center text-[11px] text-[#64748B]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  className="font-bold text-[#6366F1] hover:text-[#4F46E5] transition-colors"
                >
                  Sign in →
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-[#94A3B8]">
          <ShieldCheck className="inline h-3 w-3 mr-1 text-[#10B981]" />
          Protected by RevenueAI Deterministic Safety Barrier v2.2
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-[#ECEEF2] p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1]">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">Password Reset</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              In this sandbox environment, demo credentials are pre-configured in your{' '}
              <code className="bg-[#F1F5F9] px-1.5 py-0.5 rounded font-mono text-[#0F172A]">.env</code> file.
            </p>
            <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-xs space-y-1 font-mono">
              <div className="text-[#64748B]">Default Demo Login:</div>
              <div className="font-bold text-[#0F172A]">demo@revenueai.app</div>
              <div className="text-[#6366F1]">Password: RevenueAI@2026</div>
            </div>
            <button
              type="button"
              onClick={() => {
                handleFillDemo();
                setShowForgotModal(false);
              }}
              className="w-full py-2.5 rounded-2xl bg-[#6366F1] text-white font-bold text-xs hover:bg-[#4F46E5] transition-colors"
            >
              Autofill &amp; Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

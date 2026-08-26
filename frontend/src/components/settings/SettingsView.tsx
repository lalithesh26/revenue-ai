import React, { useState } from 'react';
import { 
  User as UserIcon, 
  ShieldCheck, 
  Bot, 
  Sliders, 
  LogOut, 
  Lock, 
  Bell, 
  Check, 
  Zap, 
  KeyRound, 
  Sparkles,
  Server,
  RefreshCw
} from 'lucide-react';
import { Card } from '../common/Card';
import { User } from '../../types';

interface SettingsViewProps {
  user: User | null;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onLogout }) => {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'preferences' | 'ai-engine' | 'security'>('profile');
  const [userName, setUserName] = useState(user?.name || 'Alex Morgan');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Preference states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [highValueAlerts, setHighValueAlerts] = useState(true);
  const [guardrailAlerts, setGuardrailAlerts] = useState(true);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#ECEEF2]">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
            Platform Settings & Governance
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure your RevenueAI workspace, AI models, notification preferences, and session security.
          </p>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] hover:bg-[#FFE4E6] text-xs font-bold transition-colors cursor-pointer w-fit"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Navigation Pills (3 cols) */}
        <div className="lg:col-span-3 space-y-1.5">
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeSubTab === 'profile'
                ? 'bg-white border border-[#DDD6FE] text-[#6D28D9] shadow-sm'
                : 'text-[#475569] hover:bg-white hover:text-[#0F172A]'
            }`}
          >
            <UserIcon className={`h-4 w-4 ${activeSubTab === 'profile' ? 'text-[#7C3AED]' : 'text-[#94A3B8]'}`} />
            <span>Profile & Account</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ai-engine')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeSubTab === 'ai-engine'
                ? 'bg-white border border-[#DDD6FE] text-[#6D28D9] shadow-sm'
                : 'text-[#475569] hover:bg-white hover:text-[#0F172A]'
            }`}
          >
            <Bot className={`h-4 w-4 ${activeSubTab === 'ai-engine' ? 'text-[#7C3AED]' : 'text-[#94A3B8]'}`} />
            <span>AI Recovery Engine</span>
          </button>

          <button
            onClick={() => setActiveSubTab('preferences')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeSubTab === 'preferences'
                ? 'bg-white border border-[#DDD6FE] text-[#6D28D9] shadow-sm'
                : 'text-[#475569] hover:bg-white hover:text-[#0F172A]'
            }`}
          >
            <Sliders className={`h-4 w-4 ${activeSubTab === 'preferences' ? 'text-[#7C3AED]' : 'text-[#94A3B8]'}`} />
            <span>Preferences & Alerts</span>
          </button>

          <button
            onClick={() => setActiveSubTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeSubTab === 'security'
                ? 'bg-white border border-[#DDD6FE] text-[#6D28D9] shadow-sm'
                : 'text-[#475569] hover:bg-white hover:text-[#0F172A]'
            }`}
          >
            <ShieldCheck className={`h-4 w-4 ${activeSubTab === 'security' ? 'text-[#7C3AED]' : 'text-[#94A3B8]'}`} />
            <span>Security & Sessions</span>
          </button>
        </div>

        {/* Right Content Area (9 cols) */}
        <div className="lg:col-span-9">
          {/* 1. Profile Section */}
          {activeSubTab === 'profile' && (
            <Card className="p-6 sm:p-8 bg-white border-[#ECEEF2] space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A]">Account Profile</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Manage your personal details and workspace access tier.
                </p>
              </div>

              {savedSuccess && (
                <div className="flex items-center gap-2 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-xs text-[#059669]">
                  <Check className="h-4 w-4" />
                  <span>Profile changes saved successfully.</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white font-extrabold text-xl shadow-sm">
                    {userName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0F172A]">{userName}</div>
                    <div className="text-xs text-[#64748B]">{user?.email || 'demo@revenueai.app'}</div>
                    <span className="inline-block mt-1 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-mono text-[10px] font-bold px-2 py-0.5 border border-[#DDD6FE]">
                      {user?.role?.toUpperCase() || 'FINTECH ADMIN'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#334155]">Full Name</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-xs text-[#0F172A] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#334155]">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || 'demo@revenueai.app'}
                    className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-xs text-[#64748B] font-mono cursor-not-allowed"
                  />
                  <span className="text-[10px] text-[#94A3B8]">Managed by organization authentication.</span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* 2. AI Engine Section */}
          {activeSubTab === 'ai-engine' && (
            <Card className="p-6 sm:p-8 bg-white border-[#ECEEF2] space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A]">AI Recovery Engine Configuration</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Overview of the connected LLM inference layer and deterministic safety parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] space-y-1">
                  <div className="text-[11px] font-bold text-[#64748B]">Active Model</div>
                  <div className="font-mono text-sm font-bold text-[#0F172A]">openai/gpt-oss-120b</div>
                  <div className="text-[10px] text-[#10B981] font-semibold">Groq Fast Inference API</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] space-y-1">
                  <div className="text-[11px] font-bold text-[#64748B]">Decision Mode</div>
                  <div className="font-mono text-sm font-bold text-[#7C3AED]">REAL_LLM</div>
                  <div className="text-[10px] text-[#64748B]">Autonomous Heuristic Fallback Active</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] space-y-1">
                  <div className="text-[11px] font-bold text-[#64748B]">Guardrail Engine</div>
                  <div className="font-mono text-sm font-bold text-[#059669]">6 / 6 Strict Policies</div>
                  <div className="text-[10px] text-[#64748B]">Zero-Trust Deterministic Barrier</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] space-y-1">
                  <div className="text-[11px] font-bold text-[#64748B]">Max Auto-Retries</div>
                  <div className="font-mono text-sm font-bold text-[#0F172A]">3 Retries Cap</div>
                  <div className="text-[10px] text-[#64748B]">Exponential Backoff Interval</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] text-xs text-[#5B21B6] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#7C3AED]" />
                  <span>Zero Key Exposure Guarantee</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  In accordance with strict fintech security standards, all AI API credentials remain entirely within server-side environment variables and are never transmitted to the client application.
                </p>
              </div>
            </Card>
          )}

          {/* 3. Preferences Section */}
          {activeSubTab === 'preferences' && (
            <Card className="p-6 sm:p-8 bg-white border-[#ECEEF2] space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A]">Alert Preferences</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Select which events trigger live dashboard alerts.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 rounded-2xl border border-[#ECEEF2] hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">High-Value Recovery Alerts</div>
                    <div className="text-[11px] text-[#64748B]">Notify immediately when failed payments exceed ₹10,000.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={highValueAlerts}
                    onChange={(e) => setHighValueAlerts(e.target.checked)}
                    className="h-4 w-4 rounded border-[#CBD5E1] text-[#6366F1] focus:ring-[#6366F1]"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-2xl border border-[#ECEEF2] hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">Guardrail Policy Enforcement Alerts</div>
                    <div className="text-[11px] text-[#64748B]">Receive notifications when an AI proposal is blocked by safety checks.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={guardrailAlerts}
                    onChange={(e) => setGuardrailAlerts(e.target.checked)}
                    className="h-4 w-4 rounded border-[#CBD5E1] text-[#6366F1] focus:ring-[#6366F1]"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-2xl border border-[#ECEEF2] hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">Email Summaries</div>
                    <div className="text-[11px] text-[#64748B]">Weekly revenue recovery yield summary report.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="h-4 w-4 rounded border-[#CBD5E1] text-[#6366F1] focus:ring-[#6366F1]"
                  />
                </label>
              </div>
            </Card>
          )}

          {/* 4. Security Section */}
          {activeSubTab === 'security' && (
            <Card className="p-6 sm:p-8 bg-white border-[#ECEEF2] space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A]">Security & Authentication</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Cryptographic standards and active session controls.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[#0F172A]">Password Hashing Standard</div>
                    <div className="text-[11px] text-[#64748B]">PBKDF2-HMAC-SHA256 (600,000 iterations + Salt)</div>
                  </div>
                  <span className="rounded-full bg-[#ECFDF5] text-[#059669] font-mono text-[10px] font-bold px-2.5 py-1 border border-[#A7F3D0]">
                    COMPLIANT
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#ECEEF2] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[#0F172A]">Session Status</div>
                    <div className="text-[11px] text-[#64748B]">Authenticated Token Active (HMAC-SHA256 Signed)</div>
                  </div>
                  <span className="rounded-full bg-[#F5F3FF] text-[#7C3AED] font-mono text-[10px] font-bold px-2.5 py-1 border border-[#DDD6FE]">
                    ACTIVE
                  </span>
                </div>

                <div className="pt-4 border-t border-[#ECEEF2] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">Sign Out of Session</div>
                    <div className="text-[11px] text-[#64748B]">Invalidates your active token and redirects to Sign In.</div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 rounded-2xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Log Out Now
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

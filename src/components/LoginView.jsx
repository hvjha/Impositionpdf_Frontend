import React, { useState } from 'react';
import { 
  Printer, 
  Lock, 
  User, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { loginUser } from '../services/api';

export default function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('prepressimposition');
  const [password, setPassword] = useState('impositionpdfautomation');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginUser(username, password);
      if (res.success && res.user) {
        // Save session to localStorage and mark session active
        localStorage.setItem('prepress_auth_token', res.token);
        localStorage.setItem('prepress_auth_user', JSON.stringify(res.user));
        sessionStorage.setItem('prepress_session_active', 'true');
        onLoginSuccess(res.user);
      } else {
        throw new Error(res.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Invalid Login ID or Password. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultCredentials = () => {
    setUsername('prepressimposition');
    setPassword('impositionpdfautomation');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/10 via-blue-600/15 to-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Background Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-cyan-500/25 border border-cyan-400/30">
              <Printer className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-3 border-[#070A0F] rounded-full animate-pulse flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
            PREPRESS<span className="text-cyan-400">STUDIO</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
            Production Automation & Imposition Engine
          </p>
          <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/50 text-[11px] font-mono text-cyan-300">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            CIP4 / PDF-X4 Production Access
          </div>
        </div>

        {/* Main Card */}
        {/* Main Glass Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 relative border border-white/10 shadow-2xl">
          
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-100 m-0">
              Operator Sign In
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your prepress station credentials to access the production workspace.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-700/60 flex items-start gap-2.5 text-xs text-rose-200 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Login ID Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Login ID / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4 text-cyan-400/80" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter login ID"
                  required
                  className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm text-slate-100 placeholder-slate-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4 text-cyan-400/80" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 glass-input rounded-xl text-sm text-slate-100 placeholder-slate-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Fast Auto-fill Credentials Helper */}
            <div className="pt-1">
              <button
                type="button"
                onClick={fillDefaultCredentials}
                className="w-full py-2 px-3 rounded-xl glass-card hover:border-cyan-500/50 text-[11px] text-cyan-300 flex items-center justify-center gap-2 transition-all font-medium cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-fill Operator Credentials</span>
                <span className="text-slate-500 text-[10px]">(prepressimposition)</span>
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating Station...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Prepress Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Credential Reference Note */}
          <div className="mt-6 pt-5 border-t border-[#1C2637] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="text-slate-500">Authorized ID:</span>
            <span className="text-cyan-400 font-semibold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900/60">
              prepressimposition
            </span>
          </div>

        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-4">
          <span>Enterprise v2.4</span>
          <span>•</span>
          <span>Automated Print Prepress</span>
          <span>•</span>
          <span>Security Level 4</span>
        </div>

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  Printer, 
  Lock, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  Zap,
  Eye,
  EyeOff,
  Mail
} from 'lucide-react';
import { loginUser } from '../services/api';
import Footer from './Footer';

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
    <div className="login-page">
      {/* Animated background glows */}
      <div className="login-glow login-glow-1" />
      <div className="login-glow login-glow-2" />
      <div className="login-glow login-glow-3" />
      
      {/* Subtle grid pattern */}
      <div className="login-grid-pattern" />

      <div className="login-container">
        
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo-wrap">
            <div className="login-logo">
              <Printer className="w-8 h-8 text-white" />
            </div>
            <div className="login-logo-badge" />
          </div>

          <h1 className="login-title">
            PREPRESS <span>AUTO</span>
          </h1>
          <p className="login-subtitle">
            India, Semi Bold
          </p>
        </div>

        {/* Welcome Text */}
        <div className="login-welcome">
          <h2>Welcome Back</h2>
          <p>Enter Credentials</p>
        </div>

        {/* Main Glass Card */}
        <div className="login-card">
          
          {/* Error Banner */}
          {error && (
            <div className="login-error">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {/* Email/Username Input */}
            <div className="login-field">
              <label className="login-label">Email Address</label>
              <div className="login-input-wrap">
                <Mail className="login-input-icon" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your login ID"
                  required
                  className="login-input"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="login-field">
              <div className="login-label-row">
                <label className="login-label">Password</label>
                <button type="button" className="login-forgot">
                  Forgot Password?
                </button>
              </div>
              <div className="login-input-wrap">
                <Lock className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="login-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-eye-btn"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Auto-fill Credentials */}
            <button
              type="button"
              onClick={fillDefaultCredentials}
              className="login-autofill"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-fill Operator Credentials</span>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom labels */}
          <div className="login-bottom-labels">
            <div className="login-bottom-label">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Security Login</span>
            </div>
            <div className="login-bottom-label">
              <span className="text-slate-600">|</span>
              <span>Portfolio & Security Login</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

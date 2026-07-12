import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, RefreshCw } from 'lucide-react';
import { translations } from '../assets/translations';

const AuthModal = ({ isOpen, onClose, onLogin, language }) => {
  const t = translations[language] || translations.en;

  // Tabs: 'signin' or 'signup'
  const [tab, setTab] = useState('signin');
  
  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Captcha state
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  
  // Auth statuses
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Generate new math CAPTCHA
  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 9) + 2); // 2 to 10
    setCaptchaNum2(Math.floor(Math.random() * 9) + 2);
    setCaptchaAnswer('');
    setCaptchaError('');
  };

  useEffect(() => {
    if (isOpen) {
      generateCaptcha();
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, tab]);

  if (!isOpen) return null;

  // Handle standard registration/login submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    if (tab === 'signup') {
      // Validate CAPTCHA
      const correctAns = captchaNum1 + captchaNum2;
      if (parseInt(captchaAnswer) !== correctAns) {
        setCaptchaError("Incorrect CAPTCHA answer.");
        generateCaptcha();
        return;
      }

      // Perform Mock Registration
      const users = JSON.parse(localStorage.getItem('vox_users') || '{}');
      if (users[email]) {
        setErrorMsg("Email already registered!");
        generateCaptcha();
        return;
      }

      // Save user
      users[email] = { password };
      localStorage.setItem('vox_users', JSON.stringify(users));
      
      setSuccessMsg("Account created successfully! Logging in...");
      setTimeout(() => {
        onLogin({ email });
        onClose();
      }, 1000);
    } else {
      // Perform Mock Login
      const users = JSON.parse(localStorage.getItem('vox_users') || '{}');
      const user = users[email];
      
      if (!user || user.password !== password) {
        setErrorMsg("Invalid email or password.");
        return;
      }

      setSuccessMsg("Logged in successfully!");
      setTimeout(() => {
        onLogin({ email });
        onClose();
      }, 1000);
    }
  };

  // Google OAuth Mock Sign-in (since it's a client-side serverless app, we simulate it beautifully!)
  const handleGoogleSignIn = () => {
    setErrorMsg('');
    setSuccessMsg("Connecting to Google Account...");
    
    setTimeout(() => {
      const googleEmail = "google.user@gmail.com";
      // Save user to simulated user db if not exists
      const users = JSON.parse(localStorage.getItem('vox_users') || '{}');
      if (!users[googleEmail]) {
        users[googleEmail] = { password: 'google-oauth-token-dummy' };
        localStorage.setItem('vox_users', JSON.stringify(users));
      }
      
      setSuccessMsg("Successfully logged in with Google!");
      setTimeout(() => {
        onLogin({ email: googleEmail, isGoogle: true });
        onClose();
      }, 1000);
    }, 1200);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel glow-effect" style={{
        width: '420px',
        padding: '2rem',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        animation: 'fadeIn 0.3s ease'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={18} />
        </button>

        {/* Logo / Header */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }} className="gradient-text">
            {tab === 'signin' ? 'Sign In to VoxStudio' : 'Create Free Account'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {tab === 'signin' ? 'Access your drafts & projects anytime' : 'Sign up to unlock project saving & drafts'}
          </p>
        </div>

        {/* Tabs selector */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-primary)',
          borderRadius: '8px',
          padding: '2px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            onClick={() => setTab('signin')}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              borderRadius: '6px',
              background: tab === 'signin' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'signin' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('signup')}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              borderRadius: '6px',
              background: tab === 'signup' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'signup' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Message banners */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '0.6rem 0.8rem',
            color: '#ef4444',
            fontSize: '0.8rem',
            fontWeight: 500
          }}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '6px',
            padding: '0.6rem 0.8rem',
            color: '#10b981',
            fontSize: '0.8rem',
            fontWeight: 500
          }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Email field */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
                style={{ paddingLeft: '2.25rem', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: '2.25rem', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* CAPTCHA - Register Only */}
          {tab === 'signup' && (
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                CAPTCHA Verification (Robot check)
              </label>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  letterSpacing: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  userSelect: 'none'
                }}>
                  <span>{captchaNum1} + {captchaNum2} =</span>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Answer"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className="form-input"
                  style={{ flex: 1, fontSize: '0.9rem', textAlign: 'center' }}
                />
              </div>
              {captchaError && (
                <span style={{ color: '#ef4444', fontSize: '0.7rem', display: 'block', marginTop: '4px' }}>
                  {captchaError}
                </span>
              )}
            </div>
          )}

          {/* Action button */}
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
          >
            {tab === 'signin' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.75rem',
          margin: '0.5rem 0'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span style={{ padding: '0 8px' }}>or continue with</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        {/* Google Sign-in button */}
        <button
          onClick={handleGoogleSignIn}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '0.75rem',
            background: '#ffffff',
            color: '#1f2937', // dark slate
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {/* Flat Google logo svg */}
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.15-1.8H9v3.4h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.4z"/>
            <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.8-3.1.8-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 15.9 5.5 18 9 18z"/>
            <path fill="#FBBC05" d="M3.9 10.6c-.2-.5-.3-1.1-.3-1.6s.1-1.1.3-1.6V5.1H.9C.3 6.3 0 7.6 0 9s.3 2.7.9 3.9l3-2.3z"/>
            <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6C13.4 1.1 11.4 0 9 0 5.5 0 2.4 2.1.9 5.1l3 2.3c.7-2.2 2.7-3.8 5.1-3.8z"/>
          </svg>
          Google Sign-In
        </button>
      </div>
    </div>
  );
};

export default AuthModal;

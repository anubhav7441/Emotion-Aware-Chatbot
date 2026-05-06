import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login, register, verifyEmail, resendCode } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Auth() {
  const [params]              = useSearchParams();
  const [mode, setMode]       = useState(params.get('mode') || 'login');
  const [step, setStep]       = useState(1);
  const [userId, setUserId]   = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [form, setForm]       = useState({ username: '', email: '', password: '' });
  const [code, setCode]       = useState(['', '', '', '', '', '']);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate               = useNavigate();
  const isDark                 = theme === 'dark';

  // ── Submit handler ───────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const { data } = await register(form);

        // Case 1: Backend auto-verified (no Gmail config set up)
        // → go straight to chat
        if (data.verified && data.access_token) {
          localStorage.setItem('token',    data.access_token);
          localStorage.setItem('username', form.username);
          localStorage.removeItem('isGuest');
          navigate('/chat');
          return;
        }

        // Case 2: Email verification sent
        setUserId(data.user_id);
        setUserEmail(form.email);
        setSuccess(`Code sent to ${form.email}`);
        setStep(2);

      } else {
        // Login
        const { data } = await login(form.username, form.password);
        localStorage.setItem('token',    data.access_token);
        localStorage.setItem('username', form.username);
        localStorage.removeItem('isGuest');
        navigate('/chat');
      }
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      if (detail.includes('Email already registered')) {
        setError('This email is already registered. Try signing in instead.');
      } else if (detail.includes('Username already taken')) {
        setError('This username is taken. Please choose another one.');
      } else if (detail.includes('Incorrect')) {
        setError('Wrong username or password. Please try again.');
      } else if (detail.includes('verify your email')) {
        setError('Please verify your email before signing in.');
      } else if (err.response?.status === 500) {
        setError('Server error. Make sure the backend is running on port 8000.');
      } else if (!err.response) {
        setError('Cannot connect to server. Make sure backend is running.');
      } else {
        setError(detail || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Code input handler ───────────────────────────────────
  const handleCodeInput = (val, idx) => {
    const updated  = [...code];
    updated[idx]   = val.replace(/\D/g, '').slice(-1); // digits only
    setCode(updated);
    if (val && idx < 5) {
      document.getElementById(`code-${idx + 1}`)?.focus();
    }
  };

  // ── Verify email ─────────────────────────────────────────
  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Please enter all 6 digits');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await verifyEmail(userId, fullCode);
      localStorage.setItem('token',    data.access_token);
      localStorage.setItem('username', data.username);
      localStorage.removeItem('isGuest');
      navigate('/chat');
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      if (detail.includes('Invalid')) {
        setError('Wrong code. Please check your email and try again.');
      } else if (detail.includes('expired')) {
        setError('Code expired. Click "Resend code" to get a new one.');
      } else {
        setError(detail || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Resend code ──────────────────────────────────────────
  const handleResend = async () => {
    setError('');
    setSuccess('');
    try {
      await resendCode(userId);
      setSuccess('New code sent! Check your email.');
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-0')?.focus();
    } catch {
      setError('Could not resend. Please try again.');
    }
  };

  // ── Shared styles ────────────────────────────────────────
  const bg      = isDark ? '#06060f'                : '#f0efff';
  const surface = isDark ? 'rgba(20,20,35,0.85)'   : 'rgba(255,255,255,0.9)';
  const border  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)';
  const text    = isDark ? '#ffffff'                : '#1a1a2e';
  const muted   = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.5)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)': 'rgba(0,0,0,0.03)';
  const accent  = '#6366f1';
  const accent2 = '#8b5cf6';

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative',
      fontFamily: 'DM Sans, sans-serif',
      transition: 'background 0.4s',
    }}>

      {/* Background orbs */}
      <div style={{
        position: 'fixed', top: '15%', left: '10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }}/>
      <div style={{
        position: 'fixed', bottom: '15%', right: '10%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }}/>

      {/* Animated background lines */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: isDark
          ? 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)'
          : 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
      }}/>

      {/* Back button */}
      <div style={{
        position: 'fixed', top: '20px', left: '20px', zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '9px 18px', borderRadius: '10px',
            background: surface, border: `1px solid ${border}`,
            color: text, cursor: 'pointer', fontSize: '13px',
            fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', gap: '6px',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = accent}
          onMouseLeave={e => e.currentTarget.style.borderColor = border}
        >
          ← Back
        </button>
      </div>

      {/* Theme toggle */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10 }}>
        <button
          onClick={toggleTheme}
          style={{
            width: '42px', height: '42px', borderRadius: '11px',
            background: surface, border: `1px solid ${border}`,
            cursor: 'pointer', fontSize: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = accent}
          onMouseLeave={e => e.currentTarget.style.borderColor = border}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: '440px',
          background: surface,
          border: `1px solid ${border}`,
          borderRadius: '24px', padding: '40px',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: isDark
            ? '0 30px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)'
            : '0 20px 50px rgba(0,0,0,0.1)',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: '12px', marginBottom: '32px',
        }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: `linear-gradient(135deg, ${accent}, ${accent2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px',
            boxShadow: `0 4px 16px rgba(99,102,241,0.4)`,
          }}>🧠</div>
          <div>
            <div style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800,
              fontSize: '17px', color: text,
            }}>EmoChat AI</div>
            <div style={{ fontSize: '11px', color: muted, marginTop: '1px' }}>
              Emotionally intelligent assistant
            </div>
          </div>
        </div>

        {/* ── AnimatePresence switches between form and verify ── */}
        <AnimatePresence mode="wait">

          {/* ── STEP 1: Form ── */}
          {step === 1 && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0   }}
              exit={{    opacity: 0, x:  10  }}
              transition={{ duration: 0.25 }}
            >
              {/* Mode tabs */}
              <div style={{
                display: 'flex',
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                borderRadius: '12px', padding: '4px',
                marginBottom: '28px',
                border: `1px solid ${border}`,
              }}>
                {['login', 'register'].map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '9px',
                      border: 'none', cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      fontWeight: 600, fontSize: '14px',
                      transition: 'all 0.25s',
                      background: mode === m
                        ? `linear-gradient(135deg, ${accent}, ${accent2})`
                        : 'transparent',
                      color: mode === m ? '#fff' : muted,
                      boxShadow: mode === m
                        ? '0 3px 12px rgba(99,102,241,0.3)' : 'none',
                    }}
                  >
                    {m === 'login' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              {/* Title */}
              <h2 style={{
                fontFamily: 'Syne, sans-serif', fontSize: '22px',
                fontWeight: 700, marginBottom: '6px', color: text,
              }}>
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{
                color: muted, fontSize: '14px', marginBottom: '24px',
              }}>
                {mode === 'login'
                  ? 'Sign in to continue your conversations'
                  : 'Start your emotion-aware AI experience'}
              </p>

              {/* Fields */}
              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                {['username',
                  ...(mode === 'register' ? ['email'] : []),
                  'password',
                ].map(field => (
                  <div key={field}>
                    <label style={{
                      display: 'block', fontSize: '11px', fontWeight: 700,
                      color: muted, marginBottom: '6px',
                      textTransform: 'uppercase', letterSpacing: '0.8px',
                    }}>
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                      type={
                        field === 'password' ? 'password' :
                        field === 'email'    ? 'email'    : 'text'
                      }
                      placeholder={`Enter your ${field}`}
                      value={form[field]}
                      onChange={e => setForm({ ...form, [field]: e.target.value })}
                      onFocus={e => e.target.style.borderColor = accent}
                      onBlur={e  => e.target.style.borderColor = border}
                      required
                      autoComplete={field === 'password' ? 'current-password' : field}
                      style={{
                        width: '100%', padding: '12px 16px',
                        fontSize: '14px',
                        background: inputBg,
                        border: `1px solid ${border}`,
                        borderRadius: '12px', color: text,
                        fontFamily: 'DM Sans, sans-serif',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0  }}
                      exit={{    opacity: 0        }}
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '10px', padding: '10px 14px',
                        fontSize: '13px', color: '#f87171',
                        display: 'flex', gap: '8px', alignItems: 'flex-start',
                      }}
                    >
                      <span style={{ flexShrink: 0 }}>⚠️</span>
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.01 } : {}}
                  whileTap={!loading  ? { scale: 0.99 } : {}}
                  style={{
                    padding: '14px', borderRadius: '12px', border: 'none',
                    background: loading
                      ? 'rgba(99,102,241,0.5)'
                      : `linear-gradient(135deg, ${accent}, ${accent2})`,
                    color: '#fff', fontSize: '15px', fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
                    marginTop: '4px',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '16px', height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff', borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                        flexShrink: 0,
                      }}/>
                      Please wait...
                    </>
                  ) : (
                    mode === 'login' ? 'Sign In →' : 'Create Account →'
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2: Email verification ── */}
          {step === 2 && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0  }}
              exit={{    opacity: 0        }}
              transition={{ duration: 0.25 }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  style={{ fontSize: '52px', marginBottom: '14px' }}
                >📧</motion.div>
                <h2 style={{
                  fontFamily: 'Syne, sans-serif', fontSize: '22px',
                  fontWeight: 700, marginBottom: '8px', color: text,
                }}>
                  Check your email
                </h2>
                <p style={{ color: muted, fontSize: '14px', lineHeight: 1.6 }}>
                  We sent a 6-digit code to
                </p>
                <p style={{
                  color: text, fontWeight: 600, fontSize: '14px',
                  marginTop: '4px',
                }}>
                  {userEmail || form.email}
                </p>
              </div>

              {/* Success message */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0  }}
                    exit={{    opacity: 0        }}
                    style={{
                      background: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: '10px', padding: '10px 14px',
                      fontSize: '13px', color: '#4ade80',
                      textAlign: 'center', marginBottom: '16px',
                    }}
                  >
                    ✓ {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 6-digit code boxes */}
              <div style={{
                display: 'flex', gap: '8px',
                justifyContent: 'center', marginBottom: '20px',
              }}>
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`code-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeInput(e.target.value, idx)}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !digit && idx > 0) {
                        document.getElementById(`code-${idx - 1}`)?.focus();
                      }
                    }}
                    onPaste={e => {
                      // Handle paste of full 6-digit code
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (pasted.length === 6) {
                        setCode(pasted.split(''));
                        document.getElementById('code-5')?.focus();
                      }
                    }}
                    onFocus={e => e.target.style.borderColor = accent}
                    onBlur={e  => e.target.style.borderColor = border}
                    style={{
                      width: '50px', height: '58px',
                      textAlign: 'center', fontSize: '24px', fontWeight: 700,
                      background: inputBg,
                      border: `2px solid ${digit ? accent : border}`,
                      borderRadius: '12px', color: text,
                      fontFamily: 'DM Sans, sans-serif',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                  />
                ))}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0  }}
                    exit={{    opacity: 0        }}
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '10px', padding: '10px 14px',
                      fontSize: '13px', color: '#f87171',
                      textAlign: 'center', marginBottom: '14px',
                      display: 'flex', gap: '8px', alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span>⚠️</span><span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Verify button */}
              <motion.button
                onClick={handleVerify}
                disabled={loading || code.join('').length < 6}
                whileHover={!loading ? { scale: 1.01 } : {}}
                whileTap={!loading  ? { scale: 0.99 } : {}}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: '12px', border: 'none',
                  background: code.join('').length === 6 && !loading
                    ? `linear-gradient(135deg, ${accent}, ${accent2})`
                    : 'rgba(99,102,241,0.4)',
                  color: '#fff', fontSize: '15px', fontWeight: 600,
                  cursor: loading || code.join('').length < 6 ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  boxShadow: code.join('').length === 6
                    ? '0 4px 20px rgba(99,102,241,0.35)' : 'none',
                  marginBottom: '14px',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: '16px', height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }}/>
                    Verifying...
                  </>
                ) : 'Verify Email →'}
              </motion.button>

              {/* Resend + back */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <button
                  onClick={() => { setStep(1); setError(''); setSuccess(''); setCode(['','','','','','']); }}
                  style={{
                    background: 'none', border: 'none', color: muted,
                    cursor: 'pointer', fontSize: '13px',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleResend}
                  style={{
                    background: 'none', border: 'none', color: accent,
                    cursor: 'pointer', fontSize: '13px',
                    fontFamily: 'DM Sans, sans-serif',
                    textDecoration: 'underline',
                  }}
                >
                  Resend code
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(128,128,160,0.4); }
        input { outline: none; }
      `}</style>
    </div>
  );
}
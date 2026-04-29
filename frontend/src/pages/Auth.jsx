import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login, register, verifyEmail, resendCode } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import InteractiveBackground from '../components/InteractiveBackground';

export default function Auth() {
  const [params]   = useSearchParams();
  const [mode, setMode]       = useState(params.get('mode') || 'login');
  const [step, setStep]       = useState(1); // 1=form, 2=verify email
  const [userId, setUserId]   = useState(null);
  const [form, setForm]       = useState({ username: '', email: '', password: '' });
  const [code, setCode]       = useState(['', '', '', '', '', '']);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme }     = useTheme();
  const navigate              = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const { data } = await register(form);
        setUserId(data.user_id);
        setSuccess(`Verification code sent to ${form.email}`);
        setStep(2);
      } else {
        const { data } = await login(form.username, form.password);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', form.username);
        navigate('/chat');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = (val, idx) => {
    const updated = [...code];
    updated[idx] = val.slice(-1);
    setCode(updated);
    if (val && idx < 5) {
      document.getElementById(`code-${idx + 1}`)?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) { setError('Enter all 6 digits'); return; }
    setError(''); setLoading(true);
    try {
      const { data } = await verifyEmail(userId, fullCode);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('username', data.username);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await resendCode(userId);
      setSuccess('New code sent!');
    } catch {
      setError('Failed to resend');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative',
    }}>
      {/* Background */}
      <InteractiveBackground />

      {/* Back + Theme */}
      <div style={{ position: 'fixed', top: '20px', left: '24px', display: 'flex', gap: '10px', zIndex: 10 }}>
        <button onClick={() => navigate('/')} style={{
          padding: '8px 16px', borderRadius: '10px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          color: 'var(--text)', cursor: 'pointer', fontSize: '13px',
          fontFamily: 'DM Sans, sans-serif',
        }}>← Back</button>
      </div>
      <div style={{ position: 'fixed', top: '20px', right: '24px', zIndex: 10 }}>
        <button onClick={toggleTheme} style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          cursor: 'pointer', fontSize: '18px', color: 'var(--text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%', maxWidth: '440px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '24px', padding: '40px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', boxShadow: '0 4px 15px rgba(108,99,255,0.35)',
          }}>🧠</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px' }}>
            EmoChat AI
          </span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Mode tabs */}
              <div style={{
                display: 'flex', background: 'var(--surface)',
                borderRadius: '12px', padding: '4px', marginBottom: '28px',
                border: '1px solid var(--border)',
              }}>
                {['login', 'register'].map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(''); }}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '9px',
                      border: 'none', cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                      transition: 'all 0.2s',
                      background: mode === m
                        ? 'linear-gradient(135deg, var(--accent), var(--accent2))'
                        : 'transparent',
                      color: mode === m ? '#fff' : 'var(--muted)',
                    }}>
                    {m === 'login' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              <h2 style={{
                fontFamily: 'Syne, sans-serif', fontSize: '22px',
                fontWeight: 700, marginBottom: '6px',
              }}>
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
                {mode === 'login'
                  ? 'Sign in to continue your conversations'
                  : 'Start your emotion-aware AI experience'}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {['username', ...(mode === 'register' ? ['email'] : []), 'password'].map(field => (
                  <div key={field}>
                    <label style={{
                      display: 'block', fontSize: '11px', fontWeight: 600,
                      color: 'var(--muted)', marginBottom: '6px',
                      textTransform: 'uppercase', letterSpacing: '0.8px',
                    }}>
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                      style={{
                        width: '100%', padding: '12px 16px',
                        fontSize: '14px', background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px', color: 'var(--text)',
                        transition: 'border-color 0.2s',
                      }}
                      type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                      placeholder={`Enter your ${field}`}
                      value={form[field]}
                      onChange={e => setForm({ ...form, [field]: e.target.value })}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      required
                    />
                  </div>
                ))}

                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px', padding: '10px 14px',
                    fontSize: '13px', color: '#f87171',
                  }}>⚠️ {error}</div>
                )}

                <button type="submit" disabled={loading} style={{
                  padding: '14px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  color: '#fff', fontSize: '15px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  fontFamily: 'DM Sans, sans-serif',
                  boxShadow: '0 4px 20px rgba(108,99,255,0.35)',
                  marginTop: '4px',
                }}>
                  {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📧</div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                  Check your email
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
                  We sent a 6-digit code to<br/>
                  <strong style={{ color: 'var(--text)' }}>{form.email}</strong>
                </p>
              </div>

              {success && (
                <div style={{
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '10px', padding: '10px 14px', fontSize: '13px',
                  color: '#4ade80', textAlign: 'center', marginBottom: '16px',
                }}>✓ {success}</div>
              )}

              {/* 6-digit code input */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
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
                    style={{
                      width: '52px', height: '60px', textAlign: 'center',
                      fontSize: '24px', fontWeight: 700,
                      background: 'var(--surface)', border: '2px solid var(--border)',
                      borderRadius: '12px', color: 'var(--text)',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                ))}
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '10px', padding: '10px 14px', fontSize: '13px',
                  color: '#f87171', textAlign: 'center', marginBottom: '16px',
                }}>⚠️ {error}</div>
              )}

              <button onClick={handleVerify} disabled={loading} style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                boxShadow: '0 4px 20px rgba(108,99,255,0.35)',
                marginBottom: '14px',
              }}>
                {loading ? 'Verifying...' : 'Verify Email →'}
              </button>

              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                Didn't receive it?{' '}
                <button onClick={handleResend} style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
                  textDecoration: 'underline',
                }}>Resend code</button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
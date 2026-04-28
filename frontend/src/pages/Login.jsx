import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import InteractiveBackground from '../components/InteractiveBackground';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm]     = useState({ username: '', email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) await register(form);
      const { data } = await login(form.username, form.password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('userId', data.user_id);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050508',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Interactive Background */}
      <InteractiveBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'rgba(20, 20, 30, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '32px',
          padding: '48px',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 30px 60px -10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 5 }}
          style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}
        >
          <div style={{
            width: '52px', height: '52px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', boxShadow: '0 8px 25px -5px rgba(99,102,241,0.4)',
          }}>🧠</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '22px', color: '#fff', letterSpacing: '-0.5px' }}>
              EmoChat <span style={{ color: '#8b5cf6' }}>AI</span>
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              Emotion-aware assistant
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 600, color: '#fff', letterSpacing: '-0.5px' }}>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
            {isRegister
              ? 'Start your emotion-aware AI experience'
              : 'Sign in to continue your conversations'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Username
            </label>
            <input
              style={{
                width: '100%', background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px', padding: '14px 18px',
                fontSize: '15px', color: '#fff',
                transition: 'all 0.3s ease',
              }}
              placeholder="Enter your username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.background = 'rgba(0,0,0,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.background = 'rgba(0,0,0,0.2)' }}
              required
            />
          </div>

          <AnimatePresence>
            {isRegister && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
              >
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Email
                </label>
                <input
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px', padding: '14px 18px',
                    fontSize: '15px', color: '#fff',
                    transition: 'all 0.3s ease',
                  }}
                  placeholder="Enter your email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.background = 'rgba(0,0,0,0.4)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.background = 'rgba(0,0,0,0.2)' }}
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Password
            </label>
            <input
              style={{
                width: '100%', background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px', padding: '14px 18px',
                fontSize: '15px', color: '#fff',
                transition: 'all 0.3s ease',
              }}
              placeholder="Enter your password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.background = 'rgba(0,0,0,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.background = 'rgba(0,0,0,0.2)' }}
              required
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '12px', padding: '12px 16px',
                fontSize: '14px', color: '#fca5a5',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}
            >
              <span>⚠️</span> {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(99,102,241,0.5)' }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', marginTop: '12px',
              background: loading
                ? 'rgba(99,102,241,0.3)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              padding: '16px', fontSize: '15px',
              fontWeight: 600, color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px -5px rgba(99,102,241,0.4)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }}/>
                Processing...
              </span>
            ) : isRegister ? 'Create Account' : 'Sign In'}
          </motion.button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          margin: '32px 0',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1))' }}/>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
            {isRegister ? 'Or' : 'New here?'}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg, transparent, rgba(255,255,255,0.1))' }}/>
        </div>

        <button
          onClick={() => { setIsRegister(!isRegister); setError(''); }}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px', padding: '14px',
            fontSize: '14px', color: '#fff', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.3s ease',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseEnter={e => {
            e.target.style.background = 'rgba(255,255,255,0.06)';
            e.target.style.borderColor = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={e => {
            e.target.style.background = 'rgba(255,255,255,0.03)';
            e.target.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          {isRegister ? 'Sign in instead' : 'Create free account'}
        </button>

      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}
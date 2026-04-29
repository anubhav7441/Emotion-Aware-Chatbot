import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { guestLogin } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import InteractiveBackground from '../components/InteractiveBackground';

export default function Landing() {
  const [showIntro, setShowIntro] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const navigate   = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGuest = async () => {
    setLoading(true);
    try {
      const { data } = await guestLogin();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('isGuest', 'true');
      navigate('/chat');
    } catch {
      navigate('/chat');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: '🎭', title: 'Emotion Detection', desc: 'Detects happy, sad, angry, fear, and neutral from your text and voice in real time.' },
    { icon: '🎙️', title: 'Voice Input',       desc: 'Speak naturally — your voice is transcribed and analyzed for emotional tone.' },
    { icon: '🧠', title: 'Adaptive AI',        desc: 'Responses adapt to your mood. Comforting when sad, energetic when happy.' },
    { icon: '🔊', title: 'Voice Responses',    desc: 'The AI speaks back with a tone that matches your emotional state.' },
    { icon: '📊', title: 'Mood Analytics',     desc: 'Track your emotional patterns over time with session statistics.' },
    { icon: '🔒', title: 'Secure & Private',   desc: 'End-to-end encryption. Your conversations stay private.' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Interactive background */}
      <InteractiveBackground />
      {/* Floating Intro Overlay */}
<AnimatePresence>
  {showIntro && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      onClick={() => setShowIntro(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(6,6,15,0.85)',
        backdropFilter: 'blur(16px)',
        cursor: 'pointer',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0,  scale: 1   }}
        exit={{    opacity: 0, y: -20, scale: 0.95 }}
        transition={{ delay: 0.15, duration: 0.6, type: 'spring', bounce: 0.3 }}
        onClick={e => e.stopPropagation()}
        style={{
          textAlign: 'center', padding: '56px 48px',
          maxWidth: '520px', width: '90%',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '32px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(108,99,255,0.15)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Glow behind text */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>

        {/* Brain icon */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            fontSize: '56px', marginBottom: '24px',
            filter: 'drop-shadow(0 0 20px rgba(108,99,255,0.5))',
            display: 'block',
          }}
        >🧠</motion.div>

        {/* Project name */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 'clamp(32px, 6vw, 52px)',
            fontWeight: 800, letterSpacing: '-1.5px',
            lineHeight: 1.1, marginBottom: '16px',
            background: 'linear-gradient(135deg, #fff 0%, rgba(165,180,252,0.9) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Emotion-Aware ChatBot
        </motion.h1>

        {/* Hindi quote */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ delay: 0.45, duration: 0.6 }}
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '18px', fontWeight: 400,
            color: 'rgba(165,180,252,0.85)',
            marginBottom: '6px', lineHeight: 1.5,
            letterSpacing: '0.2px',
          }}
        >
          उसे बताओ जो तुम्हें महसूस कर सके।
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ delay: 0.55, duration: 0.6 }}
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '18px', fontWeight: 600,
            color: 'rgba(255,255,255,0.9)',
            marginBottom: '10px', lineHeight: 1.5,
          }}
        >
          मैं समझता हूँ।
        </motion.p>

        {/* Translation */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.6 }}
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.25)',
            marginBottom: '36px',
            fontStyle: 'italic',
          }}
        >
          "Tell me what you feel — I understand."
        </motion.p>

        {/* Enter button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ delay: 0.75, duration: 0.5 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowIntro(false)}
          style={{
            padding: '14px 40px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', color: '#fff',
            fontSize: '15px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            boxShadow: '0 8px 24px -4px rgba(108,99,255,0.5)',
            letterSpacing: '0.3px',
          }}
        >
          Enter Emotion-Aware ChatBot →
        </motion.button>

        {/* Click anywhere hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.18)',
            marginTop: '16px',
          }}
        >
          or click anywhere to dismiss
        </motion.p>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 48px',
        background: 'rgba(6,6,15,0.6)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            borderRadius: '10px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', boxShadow: '0 4px 15px rgba(108,99,255,0.4)',
          }}>🧠</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px' }}>
            Emotion-Aware ChatBot
          </span>
        </div>

        {/* Nav right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            cursor: 'pointer', fontSize: '18px', color: 'var(--text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button onClick={handleGuest} style={{
            padding: '9px 20px', borderRadius: '10px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--muted)', cursor: 'pointer',
            fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            Continue as Guest 
          </button>

          <button onClick={() => navigate('/auth?mode=login')} style={{
            padding: '9px 20px', borderRadius: '10px',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer',
            fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Sign In
          </button>

          <button onClick={() => navigate('/auth?mode=register')} style={{
            padding: '9px 20px', borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            border: 'none', color: '#fff',
            cursor: 'pointer', fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            boxShadow: '0 4px 15px rgba(108,99,255,0.35)',
            transition: 'all 0.2s',
          }}>
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 24px 60px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(108,99,255,0.12)',
            border: '1px solid rgba(108,99,255,0.3)',
            borderRadius: '99px', padding: '6px 16px',
            fontSize: '13px', color: 'var(--accent2)',
            marginBottom: '32px', fontWeight: 500,
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: '#22c55e', display: 'inline-block',
              boxShadow: '0 0 6px #22c55e',
            }}/>
            AI-Powered Emotion Detection · Live
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 'clamp(42px, 7vw, 88px)',
            fontWeight: 800, lineHeight: 1.05,
            letterSpacing: '-2px',
            marginBottom: '24px',
            background: theme === 'dark'
              ? 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)'
              : 'linear-gradient(135deg, #1a1a2e 0%, #4a4a8a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            AI that feels<br/>
            <span style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>what you feel</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: 'var(--muted)', maxWidth: '560px',
            margin: '0 auto 48px', lineHeight: 1.7,
          }}>
            An emotionally intelligent chatbot that detects your mood from text and voice,
            then responds with empathy — in real time.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/auth?mode=register')}
              style={{
                padding: '16px 36px', borderRadius: '14px',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                border: 'none', color: '#fff',
                fontSize: '16px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                boxShadow: '0 8px 30px rgba(108,99,255,0.4)',
              }}
            >
              Get Started Free →
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGuest}
              disabled={loading}
              style={{
                padding: '16px 36px', borderRadius: '14px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: '16px',
                fontWeight: 500, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {loading ? '...' : 'Try as Guest'}
            </motion.button>
          </div>
        </motion.div>

        {/* Emotion chips floating */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          style={{
            display: 'flex', gap: '10px', marginTop: '60px',
            flexWrap: 'wrap', justifyContent: 'center',
          }}
        >
          {[
            { e: '😊', l: 'Happy',   c: 'rgba(234,179,8,0.15)',   b: 'rgba(234,179,8,0.3)'   },
            { e: '😢', l: 'Sad',     c: 'rgba(59,130,246,0.15)',  b: 'rgba(59,130,246,0.3)'  },
            { e: '😠', l: 'Angry',   c: 'rgba(239,68,68,0.15)',   b: 'rgba(239,68,68,0.3)'   },
            { e: '😨', l: 'Fear',    c: 'rgba(168,85,247,0.15)',  b: 'rgba(168,85,247,0.3)'  },
            { e: '😐', l: 'Neutral', c: 'rgba(108,99,255,0.15)',  b: 'rgba(108,99,255,0.3)'  },
          ].map((em, i) => (
            <motion.div
              key={em.l}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background: em.c, border: `1px solid ${em.b}`,
                borderRadius: '99px', padding: '8px 18px',
                fontSize: '14px', fontWeight: 500,
                color: 'var(--text)', display: 'flex', gap: '6px',
              }}
            >
              <span>{em.e}</span><span>{em.l}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '80px 48px',
        maxWidth: '1100px', margin: '0 auto',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px',
          }}>
            Everything you need
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '16px' }}>
            Built with state-of-the-art AI for emotionally intelligent conversation
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '20px', padding: '28px',
                cursor: 'default', transition: 'border-color 0.3s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(108,99,255,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'rgba(108,99,255,0.12)',
                border: '1px solid rgba(108,99,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', marginBottom: '16px',
              }}>{f.icon}</div>
              <h3 style={{
                fontFamily: 'Syne, sans-serif', fontSize: '18px',
                fontWeight: 700, marginBottom: '8px',
              }}>{f.title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.7 }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{
        position: 'relative', zIndex: 1,
        textAlign: 'center', padding: '80px 24px 60px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px',
          }}>
            Start your conversation
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: '36px' }}>
            No credit card required. Free to get started.
          </p>
          <button
            onClick={() => navigate('/auth?mode=register')}
            style={{
              padding: '16px 48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              border: 'none', color: '#fff',
              fontSize: '16px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              boxShadow: '0 8px 30px rgba(108,99,255,0.4)',
            }}
          >
            Create Free Account →
          </button>
        </motion.div>
      </section>
    </div>
  );
}
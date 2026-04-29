import { useTheme } from '../context/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { sendMessage, sendVoice } from '../services/api';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import EmotionBadge from '../components/EmotionBadge';
import InteractiveBackground from '../components/InteractiveBackground';

const EMOTION_COLORS = {
  happy:   { bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.3)',   glow: 'rgba(234,179,8,0.15)'   },
  sad:     { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  glow: 'rgba(59,130,246,0.15)'  },
  angry:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   glow: 'rgba(239,68,68,0.15)'   },
  fear:    { bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.3)',  glow: 'rgba(168,85,247,0.15)'  },
  neutral: { bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.25)', glow: 'rgba(99,102,241,0.12)'  },
};

const EMOTION_WELCOME = {
  happy:   'You seem happy today! Let\'s keep that energy going 🌟',
  sad:     'I\'m here for you. Tell me what\'s on your mind 💙',
  angry:   'I hear you. Let\'s work through this together 🤝',
  fear:    'You\'re safe here. Take your time 🕊️',
  neutral: 'I analyze sentiment to detect emotions and respond empathetically.',
};

export default function Chat() {
  const { theme, toggleTheme }   = useTheme();
  const [messages, setMessages]  = useState([
    {
      role: 'assistant',
      content: 'Welcome to emotion-aware chatbot! How are you feeling today?\nTell me I am here to help you.\n\nइमोशन-अवेयर चैटबॉट में आपका स्वागत है! आज आप कैसा महसूस कर रहे हैं?\nमुझे बताइए, मैं आपकी मदद के लिए यहाँ हूँ।',
      emotion: 'welcoming',
      inputType: 'text'
    }
  ]);
  const [input, setInput]        = useState('');
  const [loading, setLoading]    = useState(false);
  const [audioEnabled, setAudio] = useState(true);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isSidebarOpen, setSidebarOpen]     = useState(true);
  const [username]               = useState(localStorage.getItem('username') || 'User');
  const [isGuest]                = useState(localStorage.getItem('isGuest') === 'true');
  const bottomRef  = useRef(null);
  const canvasRef  = useRef(null);
  const mouseRef   = useRef({ x: 0, y: 0 });
  const navigate   = useNavigate();
  const userId     = parseInt(localStorage.getItem('userId')) || null;

  const { isRecording, audioBlob, startRecording, stopRecording, setAudioBlob }
    = useVoiceRecorder();



  // ── Responsive sidebar ───────────────────────────────────────
  useEffect(() => {
    const check = () => setSidebarOpen(window.innerWidth > 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Auto scroll ──────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Auto send voice when recording stops ────────────────────
  useEffect(() => {
    if (audioBlob) {
      handleVoiceSend(audioBlob);
      setAudioBlob(null);
    }
  }, [audioBlob]);

  const historyForAPI = messages.map(m => ({ role: m.role, content: m.content }));
  const ec = EMOTION_COLORS[currentEmotion] || EMOTION_COLORS.neutral;

  const isDark = theme === 'dark';
  const styles = {
    bg:       isDark ? '#06060f'                    : '#f0efff',
    surface:  isDark ? 'rgba(20,20,35,0.6)'         : 'rgba(255,255,255,0.7)',
    border:   isDark ? 'rgba(255,255,255,0.06)'     : 'rgba(0,0,0,0.08)',
    text:     isDark ? '#fff'                       : '#1a1a2e',
    muted:    isDark ? 'rgba(255,255,255,0.4)'      : 'rgba(26,26,46,0.5)',
    inputBg:  isDark ? 'rgba(25,25,40,0.7)'         : 'rgba(255,255,255,0.85)',
    msgAI:    isDark ? 'rgba(30,30,50,0.7)'         : 'rgba(255,255,255,0.9)',
    msgAIBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
  };

  const playAudio = (url) => {
    if (!audioEnabled || !url) return;
    new Audio(url).play().catch(console.error);
  };

  const handleTextSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, inputType: 'text' }]);
    setLoading(true);
    try {
      const { data } = await sendMessage(userMsg, historyForAPI, userId);
      setCurrentEmotion(data.emotion || 'neutral');
      setMessages(prev => [...prev, {
        role: 'assistant', content: data.reply,
        emotion: data.emotion, confidence: data.confidence,
        audioUrl: data.audio_url,
      }]);
      playAudio(data.audio_url);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Could not reach the backend. Make sure the server is running on port 8000.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceSend = async (blob) => {
    setLoading(true);
    setMessages(prev => [...prev, {
      role: 'user', content: '🎤 Processing voice...', inputType: 'voice',
    }]);
    try {
      const { data } = await sendVoice(blob, userId);
      setCurrentEmotion(data.final_emotion || 'neutral');
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'user', content: data.transcript || '(inaudible)',
          inputType: 'voice', emotion: data.text_emotion,
        };
        return [...updated, {
          role: 'assistant', content: data.reply,
          emotion: data.final_emotion, audioUrl: data.audio_url,
        }];
      });
      playAudio(data.audio_url);
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'user', content: '🎤 (voice failed)' };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw',
      background: styles.bg, fontFamily: 'DM Sans, sans-serif',
      overflow: 'hidden', position: 'relative',
      transition: 'background 0.4s',
    }}>

      {/* Interactive Background */}
      <InteractiveBackground />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            style={{
              width: '280px', flexShrink: 0,
              background: styles.surface,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRight: `1px solid ${styles.border}`,
              display: 'flex', flexDirection: 'column',
              padding: '24px 0', zIndex: 50, height: '100%',
              boxShadow: isDark
                ? '20px 0 40px -10px rgba(0,0,0,0.5)'
                : '20px 0 40px -10px rgba(0,0,0,0.08)',
              position: 'relative',
            }}
          >
            {/* Logo */}
            <div style={{
              padding: '0 24px 24px',
              borderBottom: `1px solid ${styles.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))',
                  border: '1px solid rgba(99,102,241,0.35)',
                  borderRadius: '12px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', boxShadow: '0 4px 15px rgba(99,102,241,0.25)',
                }}>🧠</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: styles.text, fontFamily: 'Syne, sans-serif' }}>
                    EmoChat AI
                  </div>
                  <div style={{ fontSize: '11px', color: styles.muted, marginTop: '2px' }}>
                    {isGuest ? '👤 Guest Session' : `👋 ${username}`}
                  </div>
                </div>
              </div>
              {/* Mobile close */}
              <button onClick={() => setSidebarOpen(false)}
                style={{
                  background: 'transparent', border: 'none',
                  color: styles.muted, fontSize: '22px', cursor: 'pointer',
                  display: 'none',
                }}
                className="sidebar-close"
              >×</button>
            </div>

            {/* New Chat */}
            <div style={{ padding: '16px' }}>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setMessages([{
                    role: 'assistant',
                    content: 'Welcome to emotion-aware chatbot! How are you feeling today?\nTell me I am here to help you.\n\nइमोशन-अवेयर चैटबॉट में आपका स्वागत है! आज आप कैसा महसूस कर रहे हैं?\nमुझे बताइए, मैं आपकी मदद के लिए यहाँ हूँ।',
                    emotion: 'welcoming',
                    inputType: 'text'
                  }]);
                  setCurrentEmotion('neutral');
                }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: '14px', padding: '12px 16px',
                  color: styles.text, fontSize: '14px', fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <span style={{ fontSize: '18px' }}>＋</span> New Conversation
              </motion.button>
            </div>

            {/* Emotion status card */}
            <div style={{ padding: '0 16px', flex: 1, overflowY: 'auto' }}>
              <p style={{
                fontSize: '11px', fontWeight: 600, color: styles.muted,
                letterSpacing: '1px', textTransform: 'uppercase',
                marginBottom: '10px', paddingLeft: '4px',
              }}>Current Mood</p>

              <motion.div layout style={{
                background: ec.bg, border: `1px solid ${ec.border}`,
                borderRadius: '16px', padding: '16px',
                position: 'relative', overflow: 'hidden',
                boxShadow: `0 8px 24px -8px ${ec.glow}`,
              }}>
                <EmotionBadge emotion={currentEmotion} />
                <p style={{
                  fontSize: '12px', color: styles.muted,
                  marginTop: '8px', lineHeight: 1.5,
                }}>
                  {EMOTION_WELCOME[currentEmotion]}
                </p>
              </motion.div>

              {/* Stats */}
              <p style={{
                fontSize: '11px', fontWeight: 600, color: styles.muted,
                letterSpacing: '1px', textTransform: 'uppercase',
                marginBottom: '10px', paddingLeft: '4px', marginTop: '20px',
              }}>Session Stats</p>

              <div style={{
                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
                border: `1px solid ${styles.border}`,
                borderRadius: '14px', padding: '4px 16px',
              }}>
                {[
                  { label: 'Total Messages', value: messages.length },
                  { label: 'Your Messages',  value: messages.filter(m => m.role === 'user').length },
                  { label: 'AI Replies',     value: messages.filter(m => m.role === 'assistant').length },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '11px 0',
                    borderBottom: i < 2 ? `1px solid ${styles.border}` : 'none',
                    fontSize: '13px',
                  }}>
                    <span style={{ color: styles.muted }}>{s.label}</span>
                    <span style={{ color: styles.text, fontWeight: 700 }}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Guest upgrade banner */}
              {isGuest && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: '16px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: '14px', padding: '14px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ color: styles.text, fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Guest Session
                  </p>
                  <p style={{ color: styles.muted, fontSize: '12px', marginBottom: '12px', lineHeight: 1.5 }}>
                    Create a free account to save your conversations and mood history.
                  </p>
                  <button
                    onClick={() => navigate('/auth?mode=register')}
                    style={{
                      width: '100%', padding: '9px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      border: 'none', borderRadius: '10px',
                      color: '#fff', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Create Free Account
                  </button>
                </motion.div>
              )}
            </div>

            {/* Bottom controls */}
            <div style={{
              padding: '16px',
              borderTop: `1px solid ${styles.border}`,
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              {/* Theme toggle */}
              <button onClick={toggleTheme} style={{
                width: '100%', background: 'transparent',
                border: `1px solid ${styles.border}`,
                borderRadius: '12px', padding: '11px 16px',
                color: styles.muted, fontSize: '13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: '10px', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = styles.border}
              >
                <span>{isDark ? '☀️' : '🌙'}</span>
                {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              </button>

              {/* Audio toggle */}
              <button onClick={() => setAudio(!audioEnabled)} style={{
                width: '100%', background: 'transparent',
                border: `1px solid ${styles.border}`,
                borderRadius: '12px', padding: '11px 16px',
                color: styles.muted, fontSize: '13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: '10px', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = styles.border}
              >
                <span>{audioEnabled ? '🔊' : '🔇'}</span>
                {audioEnabled ? 'Voice Responses On' : 'Voice Responses Off'}
              </button>

              {/* Logout */}
              <button onClick={handleLogout} style={{
                width: '100%',
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '12px', padding: '11px 16px',
                color: '#f87171', fontSize: '13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: '10px', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}
              >
                <span>→</span> {isGuest ? 'Exit Guest Session' : 'Sign Out'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ───────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        position: 'relative', zIndex: 10, overflow: 'hidden',
      }}>

        {/* Floating Header */}
        <div style={{
          margin: '16px 16px 0',
          padding: '14px 20px',
          background: styles.surface,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${styles.border}`,
          borderRadius: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: isDark
            ? '0 8px 30px -8px rgba(0,0,0,0.5)'
            : '0 8px 30px -8px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!isSidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} style={{
                background: 'transparent', border: 'none',
                color: styles.text, fontSize: '22px', cursor: 'pointer',
              }}>≡</button>
            )}
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.8)',
            }}/>
            <span style={{
              fontSize: '15px', fontWeight: 600,
              color: styles.text, fontFamily: 'Syne, sans-serif',
            }}>EmoChat AI</span>
            <span style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '8px', padding: '3px 10px',
              fontSize: '11px', color: '#a5b4fc', fontWeight: 500,
            }}>Emotion Detection Active</span>
          </div>

          {/* Header right — theme + audio toggles */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={toggle} style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${styles.border}`,
              cursor: 'pointer', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setAudio(!audioEnabled)} style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${styles.border}`,
              cursor: 'pointer', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title={audioEnabled ? 'Mute' : 'Unmute'}
            >
              {audioEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>

        {/* ── Messages ──────────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '20px 16px', display: 'flex', flexDirection: 'column',
        }}>

          {/* Empty state */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                flex: 1, gap: '20px', textAlign: 'center',
              }}
            >
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '88px', height: '88px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '28px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '40px',
                  boxShadow: '0 20px 40px -10px rgba(99,102,241,0.25)',
                }}
              >🧠</motion.div>
              <div>
                <p style={{
                  fontSize: '20px', fontWeight: 700,
                  color: styles.text, marginBottom: '10px',
                  fontFamily: 'Syne, sans-serif', letterSpacing: '-0.5px',
                }}>
                  How are you feeling today?
                </p>
                <p style={{
                  fontSize: '14px', color: styles.muted,
                  maxWidth: '360px', lineHeight: 1.7,
                }}>
                  {EMOTION_WELCOME[currentEmotion]}
                </p>
              </div>

              {/* Emotion chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { e: '😊', l: 'Happy' }, { e: '😢', l: 'Sad' },
                  { e: '😠', l: 'Angry' }, { e: '😨', l: 'Fear' },
                  { e: '😐', l: 'Neutral' },
                ].map((em, i) => (
                  <motion.div
                    key={em.l}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, delay: i * 0.3, repeat: Infinity }}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${styles.border}`,
                      borderRadius: '99px', padding: '6px 14px',
                      fontSize: '13px', color: styles.muted,
                      display: 'flex', gap: '6px',
                    }}
                  >
                    <span>{em.e}</span><span>{em.l}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message bubbles */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '20px',
            paddingBottom: '10px',
          }}>
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.3 }}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {/* AI avatar */}
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                      border: '1px solid rgba(99,102,241,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', marginRight: '10px',
                      flexShrink: 0, alignSelf: 'flex-end',
                    }}>🧠</div>
                  )}

                  <div style={{
                    maxWidth: '72%', display: 'flex', flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: '6px',
                  }}>
                    <motion.div
                      whileHover={{ scale: 1.005 }}
                      style={{
                        padding: '14px 18px', borderRadius: '18px',
                        fontSize: '14px', lineHeight: 1.65,
                        backdropFilter: 'blur(10px)',
                        ...(msg.role === 'user' ? {
                          background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                          color: '#fff',
                          borderBottomRightRadius: '4px',
                          boxShadow: '0 8px 24px -6px rgba(99,102,241,0.4)',
                        } : {
                          background: styles.msgAI,
                          border: `1px solid ${styles.msgAIBorder}`,
                          color: styles.text,
                          borderBottomLeftRadius: '4px',
                          boxShadow: isDark
                            ? '0 8px 24px -6px rgba(0,0,0,0.3)'
                            : '0 4px 16px -4px rgba(0,0,0,0.08)',
                        }),
                      }}
                    >
                      {msg.inputType === 'voice' && (
                        <span style={{ fontSize: '13px', opacity: 0.7, marginRight: '6px' }}>🎤</span>
                      )}
                      {msg.content}
                    </motion.div>

                    {msg.emotion && (
                      <div style={{
                        transform: msg.role === 'user' ? 'translateX(-2px)' : 'translateX(2px)',
                      }}>
                        <EmotionBadge emotion={msg.emotion} confidence={msg.confidence} />
                      </div>
                    )}
                  </div>

                  {/* User avatar */}
                  {msg.role === 'user' && (
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '10px',
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      border: `1px solid ${styles.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', marginLeft: '10px',
                      flexShrink: 0, alignSelf: 'flex-end',
                    }}>
                      {isGuest ? '👤' : username[0]?.toUpperCase() || '👤'}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                  border: '1px solid rgba(99,102,241,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
                }}>🧠</div>
                <div style={{
                  background: styles.msgAI, border: `1px solid ${styles.msgAIBorder}`,
                  borderRadius: '18px', borderBottomLeftRadius: '4px',
                  padding: '16px 20px', display: 'flex', gap: '6px',
                }}>
                  {[0, 1, 2].map(idx => (
                    <motion.div key={idx}
                      animate={{ y: [0, -7, 0], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: idx * 0.15 }}
                      style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: '#8b5cf6',
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input Bar ─────────────────────────────────────── */}
        <div style={{ padding: '0 16px 16px', flexShrink: 0 }}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              display: 'flex', gap: '10px', alignItems: 'flex-end',
              background: styles.inputBg,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${styles.border}`,
              borderRadius: '20px', padding: '10px 12px 10px 18px',
              boxShadow: isDark
                ? '0 20px 40px -10px rgba(0,0,0,0.5)'
                : '0 8px 30px -8px rgba(0,0,0,0.1)',
              transition: 'all 0.3s',
            }}
          >
            <textarea
              style={{
                flex: 1, background: 'transparent',
                border: 'none', outline: 'none',
                fontSize: '14px', color: styles.text,
                resize: 'none', minHeight: '24px', maxHeight: '120px',
                lineHeight: 1.65, fontFamily: 'DM Sans, sans-serif',
                paddingTop: '5px',
              }}
              placeholder="Message EmoChat AI... (Enter to send)"
              value={input}
              rows={1}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSend();
                }
              }}
            />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Voice */}
              <motion.button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                title="Hold to record voice"
                style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  border: `1px solid ${isRecording ? 'rgba(239,68,68,0.5)' : styles.border}`,
                  background: isRecording ? 'rgba(239,68,68,0.2)' : 'transparent',
                  boxShadow: isRecording ? '0 0 16px rgba(239,68,68,0.3)' : 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '17px', transition: 'all 0.2s',
                }}
              >
                {isRecording ? '⏹' : '🎤'}
              </motion.button>

              {/* Send */}
              <motion.button
                onClick={handleTextSend}
                disabled={!input.trim() || loading}
                whileHover={input.trim() && !loading ? { scale: 1.05 } : {}}
                whileTap={input.trim() && !loading ? { scale: 0.95 } : {}}
                style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  border: 'none',
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '17px', color: '#fff',
                  boxShadow: input.trim() && !loading
                    ? '0 6px 16px -4px rgba(99,102,241,0.5)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                ➤
              </motion.button>
            </div>
          </motion.div>

          <p style={{
            textAlign: 'center', fontSize: '11px',
            color: styles.muted, marginTop: '8px',
          }}>
            Enter to send · Hold 🎤 to record · Shift+Enter for new line
          </p>
        </div>
      </div>

      <style>{`
        textarea::placeholder { color: rgba(128,128,160,0.5); }
        @media (max-width: 768px) {
          .sidebar-close { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
import { useFaceEmotion } from '../hooks/useFaceEmotion';
import FaceCamera from '../components/FaceCamera';
import { fuseEmotions } from '../utils/emotionFusion';
import { useTheme } from '../context/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { sendMessage, sendVoice } from '../services/api';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import EmotionBadge from '../components/EmotionBadge';

// ── Emotion color map ────────────────────────────────────────
const EMOTION_COLORS = {
  happy:      { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',  glow: 'rgba(234,179,8,0.15)'  },
  joyful:     { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',  glow: 'rgba(234,179,8,0.15)'  },
  excited:    { bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)', glow: 'rgba(251,146,60,0.15)' },
  sad:        { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', glow: 'rgba(59,130,246,0.15)' },
  melancholic:{ bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)',glow: 'rgba(59,130,246,0.12)' },
  angry:      { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  glow: 'rgba(239,68,68,0.15)'  },
  frustrated: { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)', glow: 'rgba(239,68,68,0.12)'  },
  fear:       { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', glow: 'rgba(168,85,247,0.15)' },
  anxious:    { bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.25)',glow: 'rgba(168,85,247,0.12)' },
  neutral:    { bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.25)',glow: 'rgba(99,102,241,0.12)' },
  welcoming:  { bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.25)',glow: 'rgba(99,102,241,0.12)' },
};

const DEFAULT_EC = {
  bg: 'rgba(99,102,241,0.10)',
  border: 'rgba(99,102,241,0.25)',
  glow: 'rgba(99,102,241,0.12)',
};

// ── Emotion welcome messages ─────────────────────────────────
const EMOTION_WELCOME = {
  happy:      "You seem happy today! Let's keep that energy going 🌟",
  joyful:     "You're glowing with joy! Love to see it 😊",
  excited:    "Your excitement is contagious! What's on your mind? 🤩",
  sad:        "I'm here for you. Tell me what's on your mind 💙",
  melancholic:"Feeling reflective today. I'm listening 🌧️",
  angry:      "I hear you. Let's work through this together 🤝",
  frustrated: "Frustration is valid. Let's figure this out 💪",
  fear:       "You're safe here. Take your time 🕊️",
  anxious:    "Breathe. I'm here with you, step by step 🌿",
  neutral:    "Ready to chat about anything. What's on your mind?",
  welcoming:  "Welcome! I detect emotions and respond with empathy.",
};

export default function Chat() {
  const { theme, toggleTheme }   = useTheme();
  const isDark                   = theme === 'dark';

  const [messages, setMessages]  = useState([
    {
      role:      'assistant',
      content:   'Welcome to EmoChat AI! 🧠\n\nI can detect your emotions from text, voice, and facial expressions — then respond with real empathy.\n\nइमोशन-अवेयर चैटबॉट में आपका स्वागत है! आज आप कैसा महसूस कर रहे हैं?',
      emotion:   'welcoming',
      inputType: 'text',
    },
  ]);
  const [input, setInput]              = useState('');
  const [loading, setLoading]          = useState(false);
  const [audioEnabled, setAudio]       = useState(true);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isSidebarOpen, setSidebarOpen]     = useState(true);
  const [mismatchAlert, setMismatchAlert]   = useState(null);
  const [username]  = useState(localStorage.getItem('username') || 'User');
  const [isGuest]   = useState(localStorage.getItem('isGuest') === 'true');

  const bottomRef = useRef(null);
  const navigate  = useNavigate();
  const userId    = parseInt(localStorage.getItem('userId')) || null;

  // ── Voice recorder ───────────────────────────────────────
  const {
    isRecording, audioBlob,
    startRecording, stopRecording, setAudioBlob,
  } = useVoiceRecorder();

  // ── Face detection ───────────────────────────────────────
  const {
    videoRef, canvasRef: faceCanvasRef,
    isLoaded: faceLoaded,
    isActive:  faceActive,
    faceEmotion, faceConf,
    expressions, error: faceError,
    startCamera, stopCamera, fps,
  } = useFaceEmotion();

  // ── Theme-aware styles ───────────────────────────────────
  const styles = {
    bg:          isDark ? '#06060f'                  : '#f0efff',
    surface:     isDark ? 'rgba(20,20,35,0.6)'       : 'rgba(255,255,255,0.7)',
    border:      isDark ? 'rgba(255,255,255,0.06)'   : 'rgba(0,0,0,0.08)',
    text:        isDark ? '#fff'                     : '#1a1a2e',
    muted:       isDark ? 'rgba(255,255,255,0.4)'    : 'rgba(26,26,46,0.5)',
    inputBg:     isDark ? 'rgba(25,25,40,0.7)'       : 'rgba(255,255,255,0.85)',
    msgAI:       isDark ? 'rgba(30,30,50,0.7)'       : 'rgba(255,255,255,0.9)',
    msgAIBorder: isDark ? 'rgba(255,255,255,0.06)'   : 'rgba(0,0,0,0.08)',
  };

  // Current emotion color config
  const ec = EMOTION_COLORS[currentEmotion] || DEFAULT_EC;

  // ── Responsive sidebar ───────────────────────────────────
  useEffect(() => {
    const check = () => setSidebarOpen(window.innerWidth > 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Auto scroll ──────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Auto send voice blob ─────────────────────────────────
  useEffect(() => {
    if (audioBlob) {
      handleVoiceSend(audioBlob);
      setAudioBlob(null);
    }
  }, [audioBlob]);

  const historyForAPI = messages.map(m => ({
    role: m.role, content: m.content,
  }));

  const playAudio = (url) => {
    if (!audioEnabled || !url) return;
    new Audio(url).play().catch(console.error);
  };

  // ── Send text message ────────────────────────────────────
  const handleTextSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');

    setMessages(prev => [...prev, {
      role: 'user', content: userMsg, inputType: 'text',
    }]);
    setLoading(true);

    try {
      // Call backend with face emotion fused in
      const { data } = await sendMessage(
        userMsg,
        historyForAPI,
        userId,
        faceActive ? faceEmotion : null,   // only send face data if camera is on
        faceActive ? faceConf    : null,
      );

      // Client-side fusion for mismatch detection
      const fusion = fuseEmotions(
        data.emotion,
        faceActive ? faceEmotion : null,
        null,
        faceActive ? faceConf    : 0,
      );

      setCurrentEmotion(fusion.emotion || data.emotion || 'neutral');

      // Show mismatch alert if detected
      if (fusion.mismatch && fusion.mismatchMsg) {
        setMismatchAlert(fusion.mismatchMsg);
        setTimeout(() => setMismatchAlert(null), 7000);
      }

      setMessages(prev => [...prev, {
        role:       'assistant',
        content:    data.reply,
        emotion:    fusion.emotion || data.emotion,
        confidence: fusion.confidence || data.confidence,
        audioUrl:   data.audio_url,
        mismatch:   fusion.mismatch,
      }]);

      playAudio(data.audio_url);

    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: '⚠️ Could not reach the backend. Make sure the server is running on port 8000.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Send voice message ───────────────────────────────────
  const handleVoiceSend = async (blob) => {
    setLoading(true);
    setMessages(prev => [...prev, {
      role: 'user', content: '🎤 Processing voice...', inputType: 'voice',
    }]);

    try {
      const { data } = await sendVoice(blob, userId);

      const fusion = fuseEmotions(
        data.final_emotion,
        faceActive ? faceEmotion : null,
        null,
        faceActive ? faceConf    : 0,
      );

      setCurrentEmotion(fusion.emotion || data.final_emotion || 'neutral');

      if (fusion.mismatch && fusion.mismatchMsg) {
        setMismatchAlert(fusion.mismatchMsg);
        setTimeout(() => setMismatchAlert(null), 7000);
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role:      'user',
          content:   data.transcript || '(inaudible)',
          inputType: 'voice',
          emotion:   data.text_emotion,
        };
        return [...updated, {
          role:       'assistant',
          content:    data.reply,
          emotion:    fusion.emotion || data.final_emotion,
          audioUrl:   data.audio_url,
          mismatch:   fusion.mismatch,
        }];
      });

      playAudio(data.audio_url);

    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'user', content: '🎤 (voice failed)',
        };
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

  const handleNewChat = () => {
    setMessages([{
      role:      'assistant',
      content:   'New conversation started! 🧠\n\nHow are you feeling? Tell me anything — I\'m here.\n\nनई बातचीत शुरू हुई! आप कैसा महसूस कर रहे हैं?',
      emotion:   'welcoming',
      inputType: 'text',
    }]);
    setCurrentEmotion('neutral');
    setMismatchAlert(null);
  };

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw',
      background: styles.bg,
      fontFamily: 'DM Sans, sans-serif',
      overflow: 'hidden', position: 'relative',
      transition: 'background 0.4s',
    }}>

      {/* Background orbs */}
      <div style={{
        position: 'fixed', top: '10%', left: '20%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }}/>
      <div style={{
        position: 'fixed', bottom: '10%', right: '10%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }}/>

      {/* ══════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0,    opacity: 1 }}
            exit={{   x: -300,  opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            style={{
              width: '290px', flexShrink: 0,
              background:      styles.surface,
              backdropFilter:  'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRight: `1px solid ${styles.border}`,
              display: 'flex', flexDirection: 'column',
              padding: '20px 0',
              zIndex: 50, height: '100%',
              boxShadow: isDark
                ? '20px 0 40px -10px rgba(0,0,0,0.5)'
                : '20px 0 40px -10px rgba(0,0,0,0.08)',
            }}
          >
            {/* ── Logo ── */}
            <div style={{
              padding: '0 20px 20px',
              borderBottom: `1px solid ${styles.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px', height: '38px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))',
                  border: '1px solid rgba(99,102,241,0.35)',
                  borderRadius: '11px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', boxShadow: '0 4px 15px rgba(99,102,241,0.25)',
                }}>🧠</div>
                <div>
                  <div style={{
                    fontWeight: 700, fontSize: '15px',
                    color: styles.text, fontFamily: 'Syne, sans-serif',
                  }}>EmoChat AI</div>
                  <div style={{ fontSize: '11px', color: styles.muted, marginTop: '1px' }}>
                    {isGuest ? '👤 Guest Session' : `👋 ${username}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="sidebar-close"
                style={{
                  background: 'transparent', border: 'none',
                  color: styles.muted, fontSize: '20px',
                  cursor: 'pointer', display: 'none',
                }}
              >×</button>
            </div>

            {/* ── New Chat ── */}
            <div style={{ padding: '14px 14px 0' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNewChat}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: '12px', padding: '11px 14px',
                  color: styles.text, fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <span style={{ fontSize: '16px' }}>＋</span>
                New Conversation
              </motion.button>
            </div>

            {/* ── Scrollable content ── */}
            <div style={{
              flex: 1, overflowY: 'auto',
              padding: '14px',
              display: 'flex', flexDirection: 'column', gap: '14px',
            }}>

              {/* Current Mood */}
              <div>
                <p style={{
                  fontSize: '10px', fontWeight: 700, color: styles.muted,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  marginBottom: '8px', paddingLeft: '2px',
                }}>Current Mood</p>
                <motion.div
                  layout
                  style={{
                    background:   ec.bg,
                    border:       `1px solid ${ec.border}`,
                    borderRadius: '14px', padding: '14px',
                    boxShadow:    `0 6px 20px -6px ${ec.glow}`,
                  }}
                >
                  <EmotionBadge emotion={currentEmotion} />
                  <p style={{
                    fontSize: '12px', color: styles.muted,
                    marginTop: '8px', lineHeight: 1.5,
                  }}>
                    {EMOTION_WELCOME[currentEmotion] || 'Detecting your emotional state...'}
                  </p>
                </motion.div>
              </div>

              {/* Mismatch Alert */}
              <AnimatePresence>
                {mismatchAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={{    opacity: 0, y: -8, scale: 0.97 }}
                    style={{
                      background: 'rgba(251,191,36,0.1)',
                      border:     '1px solid rgba(251,191,36,0.35)',
                      borderRadius: '14px', padding: '12px 14px',
                    }}
                  >
                    <p style={{
                      fontSize: '12px', color: '#fbbf24',
                      lineHeight: 1.6,
                      display: 'flex', gap: '8px', alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                      {mismatchAlert}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── FACE CAMERA ── */}
              <div>
                <p style={{
                  fontSize: '10px', fontWeight: 700, color: styles.muted,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  marginBottom: '8px', paddingLeft: '2px',
                }}>Face Detection</p>
                <FaceCamera
                  videoRef={videoRef}
                  canvasRef={faceCanvasRef}
                  isLoaded={faceLoaded}
                  isActive={faceActive}
                  faceEmotion={faceEmotion}
                  expressions={expressions}
                  error={faceError}
                  startCamera={startCamera}
                  stopCamera={stopCamera}
                  fps={fps}
                  isDark={isDark}
                />
              </div>

              {/* Session Stats */}
              <div>
                <p style={{
                  fontSize: '10px', fontWeight: 700, color: styles.muted,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  marginBottom: '8px', paddingLeft: '2px',
                }}>Session Stats</p>
                <div style={{
                  background:   isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
                  border:       `1px solid ${styles.border}`,
                  borderRadius: '14px', padding: '4px 14px',
                }}>
                  {[
                    { label: 'Total Messages', value: messages.length               },
                    { label: 'Your Messages',  value: messages.filter(m => m.role === 'user').length      },
                    { label: 'AI Replies',     value: messages.filter(m => m.role === 'assistant').length },
                    { label: 'Face Active',    value: faceActive ? '✅ Yes' : '❌ No' },
                  ].map((s, i) => (
                    <div key={s.label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: i < 3 ? `1px solid ${styles.border}` : 'none',
                      fontSize: '12px',
                    }}>
                      <span style={{ color: styles.muted }}>{s.label}</span>
                      <span style={{ color: styles.text, fontWeight: 700 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guest upgrade banner */}
              {isGuest && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: '14px', padding: '14px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{
                    color: styles.text, fontSize: '13px',
                    fontWeight: 600, marginBottom: '6px',
                  }}>Guest Session</p>
                  <p style={{
                    color: styles.muted, fontSize: '12px',
                    marginBottom: '12px', lineHeight: 1.5,
                  }}>
                    Create a free account to save conversations and mood history.
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

            {/* ── Bottom controls ── */}
            <div style={{
              padding: '14px',
              borderTop: `1px solid ${styles.border}`,
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <button
                onClick={toggleTheme}
                style={{
                  width: '100%', background: 'transparent',
                  border: `1px solid ${styles.border}`,
                  borderRadius: '11px', padding: '10px 14px',
                  color: styles.muted, fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = styles.border}
              >
                <span>{isDark ? '☀️' : '🌙'}</span>
                {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              </button>

              <button
                onClick={() => setAudio(!audioEnabled)}
                style={{
                  width: '100%', background: 'transparent',
                  border: `1px solid ${styles.border}`,
                  borderRadius: '11px', padding: '10px 14px',
                  color: styles.muted, fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = styles.border}
              >
                <span>{audioEnabled ? '🔊' : '🔇'}</span>
                {audioEnabled ? 'Voice Responses On' : 'Voice Responses Off'}
              </button>

              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: '11px', padding: '10px 14px',
                  color: '#f87171', fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}
              >
                <span>→</span>
                {isGuest ? 'Exit Guest Session' : 'Sign Out'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          MAIN CHAT AREA
      ══════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        position: 'relative', zIndex: 10, overflow: 'hidden',
      }}>

        {/* ── Floating Header ── */}
        <div style={{
          margin: '14px 14px 0',
          padding: '12px 18px',
          background:     styles.surface,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border:       `1px solid ${styles.border}`,
          borderRadius: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: isDark
            ? '0 8px 30px -8px rgba(0,0,0,0.5)'
            : '0 8px 30px -8px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Hamburger when sidebar is hidden */}
            {!isSidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: 'transparent', border: 'none',
                  color: styles.text, fontSize: '20px', cursor: 'pointer',
                }}
              >≡</button>
            )}
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px rgba(34,197,94,0.8)',
            }}/>
            <span style={{
              fontSize: '14px', fontWeight: 600,
              color: styles.text, fontFamily: 'Syne, sans-serif',
            }}>EmoChat AI</span>
            <span style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '7px', padding: '3px 9px',
              fontSize: '11px', color: '#a5b4fc', fontWeight: 500,
            }}>
              {faceActive ? '📷 Face + Emotion Active' : 'Emotion Detection Active'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={toggleTheme}
              title={isDark ? 'Light mode' : 'Dark mode'}
              style={{
                width: '34px', height: '34px', borderRadius: '9px',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${styles.border}`,
                cursor: 'pointer', fontSize: '15px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setAudio(!audioEnabled)}
              title={audioEnabled ? 'Mute' : 'Unmute'}
              style={{
                width: '34px', height: '34px', borderRadius: '9px',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${styles.border}`,
                cursor: 'pointer', fontSize: '15px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {audioEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: '18px', paddingBottom: '8px',
          }}>
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0,  scale: 1    }}
                  transition={{ type: 'spring', bounce: 0.3 }}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {/* AI avatar */}
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '9px',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                      border: '1px solid rgba(99,102,241,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', marginRight: '8px',
                      flexShrink: 0, alignSelf: 'flex-end',
                    }}>🧠</div>
                  )}

                  <div style={{
                    maxWidth: '72%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: '5px',
                  }}>
                    <motion.div
                      whileHover={{ scale: 1.005 }}
                      style={{
                        padding: '13px 16px',
                        borderRadius: '16px',
                        fontSize: '14px', lineHeight: 1.65,
                        backdropFilter: 'blur(10px)',
                        whiteSpace: 'pre-wrap',
                        ...(msg.role === 'user' ? {
                          background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                          color: '#fff',
                          borderBottomRightRadius: '3px',
                          boxShadow: '0 6px 20px -4px rgba(99,102,241,0.4)',
                        } : {
                          background:  styles.msgAI,
                          border:      `1px solid ${styles.msgAIBorder}`,
                          color:       styles.text,
                          borderBottomLeftRadius: '3px',
                          boxShadow: isDark
                            ? '0 6px 20px -4px rgba(0,0,0,0.3)'
                            : '0 3px 12px -3px rgba(0,0,0,0.08)',
                        }),
                      }}
                    >
                      {msg.inputType === 'voice' && (
                        <span style={{ fontSize: '12px', opacity: 0.7, marginRight: '5px' }}>🎤</span>
                      )}
                      {msg.content}
                    </motion.div>

                    {/* Emotion badge */}
                    {msg.emotion && (
                      <div style={{
                        transform: msg.role === 'user' ? 'translateX(-2px)' : 'translateX(2px)',
                      }}>
                        <EmotionBadge
                          emotion={msg.emotion}
                          confidence={msg.confidence}
                        />
                      </div>
                    )}

                    {/* Mismatch indicator on message */}
                    {msg.mismatch && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '11px', color: '#fbbf24',
                      }}>
                        <span>⚠️</span>
                        <span>Emotion mismatch detected</span>
                      </div>
                    )}
                  </div>

                  {/* User avatar */}
                  {msg.role === 'user' && (
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '9px',
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      border: `1px solid ${styles.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', marginLeft: '8px',
                      flexShrink: 0, alignSelf: 'flex-end',
                    }}>
                      {isGuest ? '👤' : (username[0]?.toUpperCase() || '👤')}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0  }}
                style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '9px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                  border: '1px solid rgba(99,102,241,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px',
                }}>🧠</div>
                <div style={{
                  background:  styles.msgAI,
                  border:      `1px solid ${styles.msgAIBorder}`,
                  borderRadius: '16px', borderBottomLeftRadius: '3px',
                  padding: '14px 18px',
                  display: 'flex', gap: '5px',
                }}>
                  {[0, 1, 2].map(idx => (
                    <motion.div
                      key={idx}
                      animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: idx * 0.15 }}
                      style={{
                        width: '6px', height: '6px', borderRadius: '50%',
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

        {/* ── Input Bar ── */}
        <div style={{ padding: '0 14px 14px', flexShrink: 0 }}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0,  opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              display: 'flex', gap: '8px', alignItems: 'flex-end',
              background:     styles.inputBg,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border:       `1px solid ${styles.border}`,
              borderRadius: '18px',
              padding:      '10px 10px 10px 16px',
              boxShadow: isDark
                ? '0 16px 40px -8px rgba(0,0,0,0.5)'
                : '0 6px 24px -6px rgba(0,0,0,0.1)',
              transition: 'all 0.3s',
            }}
          >
            <textarea
              style={{
                flex: 1, background: 'transparent',
                border: 'none', outline: 'none',
                fontSize: '14px', color: styles.text,
                resize: 'none', minHeight: '24px', maxHeight: '120px',
                lineHeight: 1.65,
                fontFamily: 'DM Sans, sans-serif',
                paddingTop: '4px',
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

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {/* Voice button */}
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
                  width: '38px', height: '38px', borderRadius: '11px',
                  border: `1px solid ${isRecording ? 'rgba(239,68,68,0.5)' : styles.border}`,
                  background: isRecording ? 'rgba(239,68,68,0.2)' : 'transparent',
                  boxShadow: isRecording ? '0 0 14px rgba(239,68,68,0.3)' : 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', transition: 'all 0.2s',
                }}
              >
                {isRecording ? '⏹' : '🎤'}
              </motion.button>

              {/* Send button */}
              <motion.button
                onClick={handleTextSend}
                disabled={!input.trim() || loading}
                whileHover={input.trim() && !loading ? { scale: 1.05 } : {}}
                whileTap={input.trim()   && !loading ? { scale: 0.95 } : {}}
                style={{
                  width: '38px', height: '38px', borderRadius: '11px',
                  border: 'none',
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', color: '#fff',
                  boxShadow: input.trim() && !loading
                    ? '0 5px 14px -3px rgba(99,102,241,0.5)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                ➤
              </motion.button>
            </div>
          </motion.div>

          <p style={{
            textAlign: 'center', fontSize: '11px',
            color: styles.muted, marginTop: '7px',
          }}>
            Enter to send · Hold 🎤 to record · Shift+Enter for new line
            {faceActive && ' · 📷 Face detection active'}
          </p>
        </div>
      </div>

      <style>{`
        textarea::placeholder { color: rgba(128,128,160,0.4); }
        @media (max-width: 768px) {
          .sidebar-close { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
import { motion, AnimatePresence } from 'framer-motion';

const EXPR_EMOJIS = {
  happy: '😊', sad: '😢', angry: '😠',
  fear: '😨', excited: '🤩', neutral: '😐',
};

export default function FaceCamera({
  videoRef, canvasRef,
  isLoaded, isActive,
  faceEmotion, expressions,
  error, startCamera, stopCamera,
  isDark,
}) {
  const surface = isDark ? 'rgba(20,20,35,0.85)' : 'rgba(255,255,255,0.85)';
  const border  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const text    = isDark ? '#fff' : '#1a1a2e';
  const muted   = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.5)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: '20px',
        overflow: 'hidden',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>📷</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: text }}>
            Face Detection
          </span>
          {isActive && (
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.8)',
              display: 'inline-block',
            }}/>
          )}
        </div>
        <button
          onClick={isActive ? stopCamera : startCamera}
          disabled={!isLoaded}
          style={{
            padding: '5px 12px', borderRadius: '8px', border: 'none',
            background: isActive
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(99,102,241,0.15)',
            color: isActive ? '#f87171' : '#a5b4fc',
            fontSize: '12px', fontWeight: 600,
            cursor: isLoaded ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans, sans-serif',
            opacity: isLoaded ? 1 : 0.5,
          }}
        >
          {!isLoaded ? 'Loading...' : isActive ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Camera preview */}
      <div style={{ position: 'relative', background: '#000' }}>
        <video
          ref={videoRef}
          muted playsInline autoPlay
          style={{
            width: '100%', height: '180px',
            objectFit: 'cover', display: 'block',
            opacity: isActive ? 1 : 0,
            transition: 'opacity 0.3s',
            transform: 'scaleX(-1)', // mirror
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            transform: 'scaleX(-1)',
          }}
        />

        {/* Placeholder when camera is off */}
        {!isActive && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '8px', height: '180px',
            background: isDark ? 'rgba(10,10,20,0.8)' : 'rgba(240,240,255,0.8)',
          }}>
            <span style={{ fontSize: '32px', opacity: 0.4 }}>📷</span>
            <span style={{ fontSize: '12px', color: muted }}>
              {error || (isLoaded ? 'Click Start to enable' : 'Loading models...')}
            </span>
          </div>
        )}

        {/* Live emotion overlay */}
        <AnimatePresence>
          {isActive && faceEmotion && (
            <motion.div
              key={faceEmotion}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', bottom: '8px', left: '8px',
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(8px)',
                borderRadius: '10px', padding: '5px 10px',
                display: 'flex', alignItems: 'center', gap: '5px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ fontSize: '16px' }}>
                {EXPR_EMOJIS[faceEmotion] || '😐'}
              </span>
              <span style={{
                fontSize: '12px', fontWeight: 600,
                color: '#fff', textTransform: 'capitalize',
              }}>
                {faceEmotion}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expression bars */}
      <AnimatePresence>
        {isActive && expressions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ padding: '12px 14px' }}
          >
            {Object.entries(expressions)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([expr, val]) => (
                <div key={expr} style={{
                  display: 'flex', alignItems: 'center',
                  gap: '8px', marginBottom: '6px',
                }}>
                  <span style={{ fontSize: '12px', width: '16px' }}>
                    {EXPR_EMOJIS[expr === 'fearful' ? 'fear' : expr === 'surprised' ? 'excited' : expr] || '😐'}
                  </span>
                  <span style={{
                    fontSize: '11px', color: muted,
                    width: '70px', textTransform: 'capitalize',
                  }}>
                    {expr}
                  </span>
                  <div style={{
                    flex: 1, height: '4px',
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    borderRadius: '99px', overflow: 'hidden',
                  }}>
                    <motion.div
                      animate={{ width: `${val * 100}%` }}
                      transition={{ duration: 0.4 }}
                      style={{
                        height: '100%', borderRadius: '99px',
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: muted, width: '28px', textAlign: 'right' }}>
                    {Math.round(val * 100)}%
                  </span>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
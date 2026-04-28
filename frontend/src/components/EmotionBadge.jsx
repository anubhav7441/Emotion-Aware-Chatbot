const EMOTION_CONFIG = {
  happy:      { emoji: '😊', color: 'bg-yellow-100 text-yellow-800', label: 'Happy'      },
  excited:    { emoji: '🤩', color: 'bg-orange-100 text-orange-800', label: 'Excited'    },
  sad:        { emoji: '😢', color: 'bg-blue-100 text-blue-800',     label: 'Sad'        },
  angry:      { emoji: '😠', color: 'bg-red-100 text-red-800',       label: 'Angry'      },
  frustrated: { emoji: '😤', color: 'bg-red-100 text-red-700',       label: 'Frustrated' },
  fear:       { emoji: '😨', color: 'bg-purple-100 text-purple-800', label: 'Fear'       },
  anxious:    { emoji: '😰', color: 'bg-purple-100 text-purple-700', label: 'Anxious'    },
  neutral:    { emoji: '😐', color: 'bg-gray-100 text-gray-700',     label: 'Neutral'    },
  confused:   { emoji: '😕', color: 'bg-slate-100 text-slate-700',   label: 'Confused'   },
  grateful:   { emoji: '🙏', color: 'bg-green-100 text-green-700',   label: 'Grateful'   },
};

export default function EmotionBadge({ emotion, confidence }) {
  const isKnown = EMOTION_CONFIG[emotion];
  const cfg = isKnown || EMOTION_CONFIG.neutral;
  const label = isKnown ? cfg.label : emotion.charAt(0).toUpperCase() + emotion.slice(1);
  const emoji = isKnown ? cfg.emoji : '✨';
  
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '99px',
      fontSize: '12px', fontWeight: 500,
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.15)',
      color: 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(8px)',
    }}>
      <span>{emoji}</span>
      <span>{label}</span>
      {confidence && (
        <span style={{ opacity: 0.55, fontSize: '11px' }}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </span>
  );
}
// Emotion similarity groups — expanded to cover free-form AI emotion labels
const POSITIVE  = [
  'happy', 'excited', 'grateful', 'joyful', 'elated', 'cheerful',
  'content', 'proud', 'hopeful', 'confident', 'enthusiastic', 'optimistic',
  'playful', 'amused', 'thrilled', 'ecstatic', 'blissful', 'relieved',
];
const NEGATIVE  = [
  'sad', 'angry', 'fear', 'frustrated', 'anxious', 'melancholic',
  'upset', 'overwhelmed', 'distressed', 'hopeless', 'lonely',
  'disappointed', 'worried', 'furious', 'terrified', 'grief',
  'rage', 'bitter', 'depressed', 'heartbroken', 'stressed',
  'panicked', 'nervous', 'scared', 'exhausted', 'miserable',
  'devastated', 'helpless', 'insecure', 'irritated', 'annoyed',
];

function getGroup(emotion) {
  const e = (emotion || '').toLowerCase();
  if (POSITIVE.some(w => e.includes(w))) return 'positive';
  if (NEGATIVE.some(w => e.includes(w))) return 'negative';
  return 'neutral';
}

/**
 * Fuse text + face + voice emotions into a single verdict.
 * Also detects emotional mismatch (user might be masking feelings).
 *
 * @param {string} textEmotion   - from Gemini NLP
 * @param {string} faceEmotion   - from face-api.js
 * @param {string} voiceEmotion  - from audio analysis
 * @param {number} faceConf      - face detection confidence
 * @returns {{ emotion, confidence, mismatch, mismatchMsg, sources }}
 */
export function fuseEmotions(textEmotion, faceEmotion, voiceEmotion, faceConf = 0) {
  const sources = {};

  // Weight each modality
  if (textEmotion)  sources.text  = { emotion: textEmotion,  weight: 0.35 };
  if (voiceEmotion && voiceEmotion !== 'neutral')
                    sources.voice = { emotion: voiceEmotion, weight: 0.25 };
  if (faceEmotion && faceConf > 0.3)
                    sources.face  = { emotion: faceEmotion,  weight: 0.40 };

  // If only text available
  if (!sources.face && !sources.voice) {
    return {
      emotion:     textEmotion || 'neutral',
      confidence:  0.75,
      mismatch:    false,
      mismatchMsg: null,
      sources,
    };
  }

  // ── Detect mismatch between face and text ──────────────────
  let mismatch    = false;
  let mismatchMsg = null;

  if (sources.face && sources.text) {
    const faceGroup = getGroup(sources.face.emotion);
    const textGroup = getGroup(sources.text.emotion);

    // Case 1: clearly opposite (positive vs negative)
    if (faceGroup !== textGroup && faceGroup !== 'neutral' && textGroup !== 'neutral') {
      mismatch = true;
      if (textGroup === 'positive' && faceGroup === 'negative') {
        mismatchMsg = `You seem ${sources.text.emotion} in words, but your face shows ${sources.face.emotion}. It's okay not to be okay.`;
      } else if (textGroup === 'negative' && faceGroup === 'positive') {
        mismatchMsg = `Your words suggest ${sources.text.emotion}, but you look ${sources.face.emotion}. Things might be looking up!`;
      } else {
        mismatchMsg = `Mixed signals — words say ${sources.text.emotion} but face shows ${sources.face.emotion}. I'll respond to both.`;
      }
    }
    // Case 2: neutral words but negative face — subtle masking
    else if (textGroup === 'neutral' && faceGroup === 'negative') {
      mismatch = true;
      mismatchMsg = `Your expression shows ${sources.face.emotion} even though your words seem neutral. Want to talk about it?`;
    }
    // Case 3: neutral words but positive face — understated positivity
    else if (textGroup === 'neutral' && faceGroup === 'positive') {
      mismatch = false; // not a real mismatch — just understated
    }
  }

  // Score emotions by weighted votes
  const scores = {};
  Object.values(sources).forEach(({ emotion, weight }) => {
    scores[emotion] = (scores[emotion] || 0) + weight;
  });

  // When mismatch: trust face more (harder to fake expressions)
  const finalEmotion = mismatch
    ? (sources.face?.emotion || textEmotion || 'neutral')
    : Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

  const confidence = Math.min(0.95, Math.max(...Object.values(scores)));

  return {
    emotion: finalEmotion,
    confidence,
    mismatch,
    mismatchMsg,
    sources,
  };
}
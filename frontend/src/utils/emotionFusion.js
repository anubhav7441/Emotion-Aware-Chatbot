// Emotion similarity groups
const POSITIVE  = ['happy', 'excited', 'grateful'];
const NEGATIVE  = ['sad', 'angry', 'fear', 'frustrated', 'anxious'];
const NEUTRAL   = ['neutral', 'confused'];

function getGroup(emotion) {
  if (POSITIVE.includes(emotion)) return 'positive';
  if (NEGATIVE.includes(emotion)) return 'negative';
  return 'neutral';
}

/**
 * Fuse text + face + voice emotions into a single verdict.
 * Also detects emotional mismatch (user might be masking feelings).
 *
 * @param {string} textEmotion   - from Claude NLP
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

  // Detect mismatch between face and text
  let mismatch    = false;
  let mismatchMsg = null;

  if (sources.face && sources.text) {
    const faceGroup = getGroup(sources.face.emotion);
    const textGroup = getGroup(sources.text.emotion);

    if (faceGroup !== textGroup && faceGroup !== 'neutral' && textGroup !== 'neutral') {
      mismatch = true;

      // Specific mismatch scenarios
      if (textGroup === 'positive' && faceGroup === 'negative') {
        mismatchMsg = `You said you're ${sources.text.emotion}, but your expression shows ${sources.face.emotion}. It's okay not to be okay.`;
      } else if (textGroup === 'negative' && faceGroup === 'positive') {
        mismatchMsg = `Your words suggest ${sources.text.emotion}, but you look ${sources.face.emotion}. Things might be looking up!`;
      } else if (textGroup === 'neutral' && faceGroup === 'negative') {
        mismatchMsg = `I notice your expression shows ${sources.face.emotion} even though your words seem neutral. Want to talk about it?`;
      }
    }
  }

  // Score emotions by weighted votes
  const scores = {};
  Object.values(sources).forEach(({ emotion, weight }) => {
    scores[emotion] = (scores[emotion] || 0) + weight;
  });

  // When mismatch: trust face more (it's harder to fake)
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
// Classify any emotion word into a broad group
function classifyEmotion(emotion) {
  if (!emotion) return 'neutral';
  const e = emotion.toLowerCase();

  const positiveWords = [
    'happy','joy','excited','grateful','playful','amused','cheerful',
    'elated','content','proud','hopeful','confident','enthusiastic',
    'optimistic','love','affection','romantic','tender','delight',
  ];
  const negativeWords = [
    'sad','angry','fear','frustrated','anxious','melancholic','upset',
    'overwhelmed','distressed','hopeless','lonely','disappointed',
    'worried','furious','terrified','grief','rage','bitter','hostile',
    'depressed','heartbroken','stressed','panicked','nervous','scared',
  ];

  if (positiveWords.some(w => e.includes(w))) return 'positive';
  if (negativeWords.some(w => e.includes(w))) return 'negative';
  return 'neutral';
}

export function fuseEmotions(textEmotion, faceEmotion, voiceEmotion, faceConf = 0) {
  const sources = {};

  if (textEmotion)
    sources.text  = { emotion: textEmotion,  weight: 0.35 };
  if (voiceEmotion && voiceEmotion !== 'neutral')
    sources.voice = { emotion: voiceEmotion, weight: 0.25 };
  if (faceEmotion && faceConf > 0.3)
    sources.face  = { emotion: faceEmotion,  weight: 0.40 };

  // Only text available
  if (!sources.face && !sources.voice) {
    return {
      emotion:     textEmotion || 'neutral',
      confidence:  0.75,
      mismatch:    false,
      mismatchMsg: null,
      sources,
    };
  }

  // Detect mismatch
  let mismatch    = false;
  let mismatchMsg = null;

  if (sources.face && sources.text) {
    const faceGroup = classifyEmotion(sources.face.emotion);
    const textGroup = classifyEmotion(sources.text.emotion);

    if (
      faceGroup !== textGroup &&
      faceGroup !== 'neutral' &&
      textGroup !== 'neutral'
    ) {
      mismatch = true;

      if (textGroup === 'positive' && faceGroup === 'negative') {
        mismatchMsg = `You seem ${sources.text.emotion} in words, but your face shows ${sources.face.emotion}. It's okay — you don't have to pretend.`;
      } else if (textGroup === 'negative' && faceGroup === 'positive') {
        mismatchMsg = `Your words say ${sources.text.emotion} but you look ${sources.face.emotion}. Things looking up?`;
      } else {
        mismatchMsg = `I'm sensing a mix of ${sources.text.emotion} and ${sources.face.emotion}. Want to talk about it?`;
      }
    }
  }

  // Weighted vote
  const scores = {};
  Object.values(sources).forEach(({ emotion, weight }) => {
    scores[emotion] = (scores[emotion] || 0) + weight;
  });

  // On mismatch trust face (harder to fake)
  const finalEmotion = mismatch
    ? (sources.face?.emotion || textEmotion || 'neutral')
    : Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

  const confidence = Math.min(0.96, Math.max(...Object.values(scores)));

  return {
    emotion: finalEmotion,
    confidence,
    mismatch,
    mismatchMsg,
    sources,
  };
}
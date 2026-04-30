// Dynamic color based on emotion word
function getEmotionStyle(emotion) {
  const e = (emotion || 'neutral').toLowerCase();

  // Positive emotions
  if (['happy','joyful','excited','grateful','playful','amused',
       'cheerful','elated','content','proud','hopeful','confident',
       'enthusiastic','optimistic'].some(w => e.includes(w))) {
    return { bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.35)', color: '#fde047' };
  }

  // Sad / melancholic
  if (['sad','melancholic','depressed','heartbroken','lonely',
       'disappointed','hopeless','grief','sorrowful'].some(w => e.includes(w))) {
    return { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', color: '#93c5fd' };
  }

  // Angry / frustrated
  if (['angry','furious','frustrated','irritated','annoyed',
       'rage','bitter','resentful','hostile'].some(w => e.includes(w))) {
    return { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)', color: '#fca5a5' };
  }

  // Fear / anxious
  if (['fear','anxious','scared','worried','nervous','terrified',
       'panicked','dread','overwhelmed','stressed'].some(w => e.includes(w))) {
    return { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.35)', color: '#d8b4fe' };
  }

  // Curious / confused
  if (['curious','confused','puzzled','intrigued',
       'uncertain','perplexed'].some(w => e.includes(w))) {
    return { bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.35)', color: '#5eead4' };
  }

  // Romantic / nostalgic
  if (['romantic','nostalgic','sentimental','longing',
       'affectionate','tender'].some(w => e.includes(w))) {
    return { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.35)', color: '#f9a8d4' };
  }

  // Surprised / shocked
  if (['surprised','shocked','amazed','astonished',
       'stunned','bewildered'].some(w => e.includes(w))) {
    return { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.35)', color: '#fdba74' };
  }

  // Default neutral
  return { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', color: '#a5b4fc' };
}

function getEmotionEmoji(emotion) {
  const e = (emotion || '').toLowerCase();
  const map = [
    [['happy','joyful','cheerful','elated'],          '😊'],
    [['excited','enthusiastic','energetic'],           '🤩'],
    [['grateful','thankful','appreciative'],           '🙏'],
    [['playful','amused','fun'],                       '😄'],
    [['sad','unhappy','upset'],                        '😢'],
    [['melancholic','nostalgic','sentimental'],        '😔'],
    [['lonely','hopeless','depressed'],                '😞'],
    [['heartbroken','grief','sorrowful'],              '💔'],
    [['angry','furious','rage'],                       '😠'],
    [['frustrated','irritated','annoyed'],             '😤'],
    [['fear','scared','terrified'],                    '😨'],
    [['anxious','worried','nervous','stressed'],       '😰'],
    [['overwhelmed','panicked'],                       '😱'],
    [['surprised','shocked','astonished'],             '😲'],
    [['curious','intrigued'],                          '🤔'],
    [['confused','puzzled','perplexed'],               '😕'],
    [['romantic','affectionate','tender'],             '🥰'],
    [['confident','proud'],                            '😎'],
    [['hopeful','optimistic'],                         '🌟'],
    [['neutral','calm'],                               '😐'],
    [['content'],                                      '🙂'],
    [['bored'],                                        '😑'],
    [['disgusted'],                                    '🤢'],
    [['embarrassed','shy'],                            '😳'],
  ];

  for (const [words, emoji] of map) {
    if (words.some(w => e.includes(w))) return emoji;
  }
  return '💭'; // default for unknown emotions
}

export default function EmotionBadge({ emotion, confidence, display }) {
  const label  = display || (emotion
    ? emotion.charAt(0).toUpperCase() + emotion.slice(1)
    : 'Neutral');
  const emoji  = getEmotionEmoji(emotion);
  const style  = getEmotionStyle(emotion);

  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      gap:            '5px',
      padding:        '4px 10px',
      borderRadius:   '99px',
      fontSize:       '12px',
      fontWeight:     500,
      background:     style.bg,
      border:         `1px solid ${style.border}`,
      color:          style.color,
      backdropFilter: 'blur(8px)',
      whiteSpace:     'nowrap',
    }}>
      <span>{emoji}</span>
      <span>{label}</span>
      {confidence !== undefined && confidence !== null && (
        <span style={{ opacity: 0.55, fontSize: '11px' }}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </span>
  );
}
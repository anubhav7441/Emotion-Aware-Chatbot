import { useState, useRef, useCallback } from 'react';

// Pick a MIME type that the browser actually supports
function getSupportedMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return ''; // browser default
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob]     = useState(null);
  const mediaRecorder = useRef(null);
  const chunks        = useRef([]);
  const mimeType      = useRef('');

  const startRecording = useCallback(async () => {
    chunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime   = getSupportedMimeType();
      mimeType.current = mime;

      const options = mime ? { mimeType: mime } : {};
      mediaRecorder.current = new MediaRecorder(stream, options);

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        // Use the actual recorded mimeType — NOT 'audio/wav' (that would corrupt the data)
        const blobType = mimeType.current || 'audio/webm';
        const blob = new Blob(chunks.current, { type: blobType });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      // Collect data every 250ms so we always have data on stop
      mediaRecorder.current.start(250);
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Could not access microphone. Please allow microphone permission in your browser settings.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    setAudioBlob,
  };
}
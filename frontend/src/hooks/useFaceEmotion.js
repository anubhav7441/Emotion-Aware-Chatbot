import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

// Map face-api expressions to our emotion labels
const EXPRESSION_MAP = {
  happy:     'happy',
  sad:       'sad',
  angry:     'angry',
  fearful:   'fear',
  disgusted: 'angry',
  surprised: 'excited',
  neutral:   'neutral',
};

export function useFaceEmotion() {
  const videoRef        = useRef(null);
  const canvasRef       = useRef(null);
  const intervalRef     = useRef(null);
  const streamRef       = useRef(null);

  const [isLoaded,    setIsLoaded]    = useState(false);
  const [isActive,    setIsActive]    = useState(false);
  const [faceEmotion, setFaceEmotion] = useState(null);
  const [faceConf,    setFaceConf]    = useState(0);
  const [error,       setError]       = useState(null);
  const [expressions, setExpressions] = useState(null);

  // Load models once
  useEffect(() => {
    const load = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
        setIsLoaded(true);
        console.log('Face-api models loaded');
      } catch (e) {
        console.error('Model load error:', e);
        setError('Could not load face detection models');
      }
    };
    load();
    return () => stopCamera();
  }, []);

  const startCamera = useCallback(async () => {
    if (!isLoaded) { setError('Models still loading...'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
      setError(null);
      startDetection();
    } catch (e) {
      setError('Camera access denied');
      console.error('Camera error:', e);
    }
  }, [isLoaded]);

  const stopCamera = useCallback(() => {
    clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
    setFaceEmotion(null);
    setExpressions(null);
  }, []);

  const startDetection = useCallback(() => {
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const detection = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
          )
          .withFaceLandmarks(true)
          .withFaceExpressions();

        if (!detection) {
          setFaceEmotion('neutral');
          setExpressions(null);
          return;
        }

        const expr   = detection.expressions;
        setExpressions(expr);

        // Find dominant expression
        const top    = Object.entries(expr).reduce((a, b) => a[1] > b[1] ? a : b);
        const label  = EXPRESSION_MAP[top[0]] || 'neutral';
        const conf   = Math.round(top[1] * 100) / 100;

        setFaceEmotion(label);
        setFaceConf(conf);

        // Draw landmarks on canvas overlay
        if (canvasRef.current && videoRef.current) {
          const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
          const resized = faceapi.resizeResults(detection, dims);
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
        }
      } catch (e) {
        // Silent fail — detection errors are common and non-critical
      }
    }, 600); // detect every 600ms
  }, []);

  return {
    videoRef, canvasRef,
    isLoaded, isActive,
    faceEmotion, faceConf,
    expressions, error,
    startCamera, stopCamera,
  };
}
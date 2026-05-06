import axios from 'axios';

const API = axios.create({ baseURL: '' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const sendMessage = (message, history, userId, faceEmotion, faceConf) =>
  API.post('/api/chat', {
    message,
    conversation_history: history,
    user_id:          userId,
    face_emotion:     faceEmotion  || null,
    face_confidence:  faceConf     || null,
  });

export const sendVoice = (audioBlob, userId) => {
  const form = new FormData();
  form.append('audio', audioBlob, 'recording.wav');
  if (userId) form.append('user_id', String(userId));
  return API.post('/api/voice', form);
};

export const getHistory   = (userId) => API.get(`/api/history/${userId}`);
export const getAnalytics = (userId) => API.get(`/api/analytics/${userId}`);

export const register = (data) =>
  API.post('/api/auth/register', data);

export const verifyEmail = (user_id, code) =>
  API.post('/api/auth/verify-email', { user_id, code });

export const resendCode = (user_id) =>
  API.post(`/api/auth/resend-code?user_id=${user_id}`);

export const login = (username, password) => {
  const form = new FormData();
  form.append('username', username);
  form.append('password', password);
  return API.post('/api/auth/login', form);
};

export const guestLogin = () =>
  API.post('/api/auth/guest-token');
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import Auth from './pages/Auth';

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<Landing />} />
        <Route path="/auth"  element={<Auth />} />
        <Route path="/chat"  element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="*"      element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
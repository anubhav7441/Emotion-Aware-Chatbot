import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function InteractiveBackground() {
  const { theme } = useTheme();
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 30, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 30, damping: 20 });

  // Slower, inverted follower for parallax effect
  const springXInverted = useSpring(mouseX, { stiffness: 20, damping: 40 });
  const springYInverted = useSpring(mouseY, { stiffness: 20, damping: 40 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Calculate coordinates relative to center, but scale them down for subtlety
      mouseX.set((e.clientX - window.innerWidth / 2) * 0.15);
      mouseY.set((e.clientY - window.innerHeight / 2) * 0.15);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const isDark = theme === 'dark';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
      background: isDark ? '#050508' : '#f8fafc',
      transition: 'background 0.5s ease',
    }}>
      {/* Orb 1: Indigo */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 45, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '10%',
          left: '20%',
          width: '60vw',
          height: '60vw',
          maxWidth: '800px',
          maxHeight: '800px',
          background: isDark 
            ? 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 60%)'
            : 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 60%)',
          borderRadius: '50%',
          transformOrigin: 'center center',
          filter: 'blur(80px)',
          x: springX,
          y: springY,
        }}
      />
      
      {/* Orb 2: Purple */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, -30, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '10%',
          width: '50vw',
          height: '50vw',
          maxWidth: '700px',
          maxHeight: '700px',
          background: isDark
            ? 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 60%)'
            : 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)',
          borderRadius: '50%',
          transformOrigin: 'center center',
          filter: 'blur(90px)',
          x: springXInverted,
          y: springYInverted,
        }}
      />
      
      {/* Orb 3: Cyan */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '80vw',
        height: '80vw',
        background: isDark
          ? 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 50%)'
          : 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 50%)',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        filter: 'blur(100px)',
      }} />

      {/* Structural Grid Mesh */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: isDark 
          ? 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)'
          : 'linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)',
      }} />
    </div>
  );
}

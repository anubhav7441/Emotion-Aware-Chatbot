import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const LIGHT_COLORS = [
  'rgba(79, 70, 229, 0.4)',  // Indigo
  'rgba(139, 92, 246, 0.4)', // Purple
  'rgba(6, 182, 212, 0.4)',  // Cyan
  'rgba(236, 72, 153, 0.4)', // Pink
  'rgba(16, 185, 129, 0.4)', // Emerald
  'rgba(245, 158, 11, 0.4)', // Amber
];

const DARK_COLORS = [
  'rgba(79, 70, 229, 0.25)',  
  'rgba(139, 92, 246, 0.25)', 
  'rgba(6, 182, 212, 0.25)',  
  'rgba(236, 72, 153, 0.25)', 
  'rgba(16, 185, 129, 0.25)', 
  'rgba(245, 158, 11, 0.25)', 
];

function ParallaxCircle({ radius, index, springX, springY, isDark }) {
  // Inner circles move more, outer move less
  const factor = 1 - index * 0.1;
  const x = useTransform(springX, v => v * factor);
  const y = useTransform(springY, v => v * factor);
  
  const color = isDark 
    ? DARK_COLORS[index % DARK_COLORS.length] 
    : LIGHT_COLORS[index % LIGHT_COLORS.length];
  
  return (
    <motion.circle
      r={radius}
      cx={0}
      cy={0}
      fill="none"
      stroke={color}
      strokeWidth={1.5 + index * 0.2}
      strokeDasharray={`${3 + index} ${10 + index * 3}`}
      animate={{ rotate: index % 2 === 0 ? 360 : -360 }}
      transition={{ duration: 100 + index * 20, repeat: Infinity, ease: 'linear' }}
      style={{ x, y, originX: '0px', originY: '0px' }}
    />
  );
}

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
      mouseX.set((e.clientX - window.innerWidth / 2) * 0.25);
      mouseY.set((e.clientY - window.innerHeight / 2) * 0.25);
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

      {/* Concentric Dotted Circles */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
      }}>
        <svg style={{ overflow: 'visible' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <ParallaxCircle 
              key={i} 
              index={i} 
              radius={80 + i * 60} 
              springX={springX} 
              springY={springY} 
              isDark={isDark} 
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

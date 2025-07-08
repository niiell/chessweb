import React from 'react';
import { motion } from 'framer-motion';

const Logo = ({ isAnimated, size = 40 }) => {
  // A single, continuous path for a minimalist knight
  const knightPath = "M 4 20 L 4 9 C 4 5 7 3 10 3 C 13 3 15 4 16 6 C 17 8 16 10 14 10 L 13 10 C 12 10 11 9 11 8 L 11 7";

  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { type: "spring", duration: 2.5, bounce: 0 },
        opacity: { duration: 0.1 },
      },
    },
  };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      initial="hidden"
      animate="visible"
      variants={isAnimated ? { visible: { transition: { staggerChildren: 0.5 } } } : {}}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00BFFF" />
          <stop offset="100%" stopColor="#8A2BE2" />
        </linearGradient>
      </defs>
      <motion.path
        d={knightPath}
        fill="none"
        stroke="url(#logo-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={isAnimated ? draw : {}}
      />
    </motion.svg>
  );
};

export default Logo;

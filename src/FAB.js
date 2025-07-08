import React from 'react';
import { motion } from 'framer-motion';
import './FAB.css';

const FAB = ({ onClick }) => {
  return (
    <motion.button
      className="fab"
      onClick={onClick}
      initial={{ scale: 0, y: 100 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0, y: 100 }}
      whileHover={{ scale: 1.1, boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.3)' }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      Calculate Next Move
    </motion.button>
  );
};

export default FAB;

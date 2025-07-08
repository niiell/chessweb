import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './MultiFAB.css';

const MultiFAB = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  const fabVariants = {
    open: { rotate: 45 },
    closed: { rotate: 0 },
  };

  const subButtonVariants = {
    open: (i) => ({
      y: `-${(i + 1) * 60}px`,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 20, delay: i * 0.1 },
    }),
    closed: {
      y: 0,
      opacity: 0,
    },
  };

  return (
    <div className="multifab-container">
      <AnimatePresence>
        {isOpen &&
          actions.map((action, i) => (
            <motion.button
              key={action.label}
              className="fab-sub-button"
              onClick={action.onClick}
              variants={subButtonVariants}
              initial="closed"
              animate="open"
              exit="closed"
              custom={i}
              whileHover={{ scale: 1.1 }}
            >
              <span className={`icon-${action.icon}`}></span>
            </motion.button>
          ))}
      </AnimatePresence>
      <motion.button
        className="fab-main"
        onClick={toggleOpen}
        variants={fabVariants}
        animate={isOpen ? 'open' : 'closed'}
        whileHover={{ scale: 1.1 }}
      >
        +
      </motion.button>
    </div>
  );
};

export default MultiFAB;

import React from 'react';
import { motion } from 'framer-motion';

const EvaluationSection = ({ 
  effectiveFormattedEvaluation, 
  isEvalPulsing, 
  boardOrientation, 
  whiteHeight, 
  blackHeight, 
  resetGame, 
  flipBoard, 
  undoMove, 
  redoMove 
}) => {
  return (
    <motion.div
      className="evaluation-section"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, x: -50 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut", delay: 0.6 } },
      }}
    >
      <div className="evaluation-display">
        <label>Evaluation:</label>
        <span>{effectiveFormattedEvaluation}</span>
      </div>
      <div className={`evaluation-bar-container ${isEvalPulsing ? 'pulsing' : ''}`} style={{ flexDirection: boardOrientation === 'white' ? 'column-reverse' : 'column' }}>
        <div className="evaluation-bar-white" style={{ height: `${whiteHeight}%` }}></div>
        <div className="evaluation-bar-black" style={{ height: `${blackHeight}%` }}></div>
      </div>
    </motion.div>
  );
};

export default EvaluationSection;

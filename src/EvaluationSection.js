import React from 'react';
import './EvaluationSection.css';

const EvaluationSection = ({ evaluation, orientation, whiteHeight, isDepthAnalysisEnabled }) => {
  const getFormattedEval = () => {
    if (evaluation.score === null) return '0.0';

    let score = evaluation.type === 'cp' ? (evaluation.score / 100).toFixed(1) : `#${Math.abs(evaluation.score)}`;
    
    // Flip score for black's perspective if it's a centipawn value
    if (orientation === 'black' && evaluation.type === 'cp') {
      score = (parseFloat(score) * -1).toFixed(1);
    }
    // For mate, the sign indicates who is mating, which is intuitive regardless of orientation

    return score;
  };

  return (
    <div className="panel evaluation-section">
      <div className="evaluation-display">
        
        <div className="evaluation-score">
          <span>{getFormattedEval()}</span>
        </div>
        {evaluation.depth && isDepthAnalysisEnabled && <div className="evaluation-depth">Depth: {evaluation.depth}</div>}
        {evaluation.tbhits !== null && <div className="evaluation-tbhits">TB Hits: {evaluation.tbhits}</div>}
      </div>
      {/* Other evaluation info can go here */}
    </div>
  );
};

export default EvaluationSection;
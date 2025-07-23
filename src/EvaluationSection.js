import React from 'react';
import {
  BarChart2,
  ChevronsUp,
  Hash,
  Cpu,
  Database
} from 'react-feather';
import './EvaluationSection.css';

const EvaluationSection = ({ evaluation, orientation }) => {
  const getFormattedEval = () => {
    if (evaluation.score === null) return '+0.00';

    let score = evaluation.type === 'cp' ? (evaluation.score / 100).toFixed(2) : `#${Math.abs(evaluation.score)}`;
    
    if (orientation === 'black' && evaluation.type === 'cp') {
      score = (parseFloat(score) * -1).toFixed(2);
    }

    if (evaluation.type === 'cp' && parseFloat(score) > 0) {
      score = `+${score}`;
    }

    return score;
  };

  const EvalItem = ({ icon, label, value }) => (
    <div className="eval-item">
      <div className="eval-icon">{icon}</div>
      <div className="eval-data">
        <span className="eval-label">{label}</span>
        <span className="eval-value">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="panel evaluation-section">
      <div className="main-evaluation">
        <BarChart2 size={28} />
        <h2>{getFormattedEval()}</h2>
      </div>
      <div className="evaluation-details">
        <EvalItem icon={<ChevronsUp size={20} />} label="Depth" value={evaluation.depth || 'N/A'} />
        <EvalItem icon={<Hash size={20} />} label="Nodes" value={evaluation.nodes ? `${(evaluation.nodes / 1000).toFixed(1)}k` : 'N/A'} />
        <EvalItem icon={<Cpu size={20} />} label="NPS" value={evaluation.nps ? `${(evaluation.nps / 1000).toFixed(1)}k` : 'N/A'} />
        <EvalItem icon={<Database size={20} />} label="TB Hits" value={evaluation.tbhits || 'N/A'} />
      </div>
    </div>
  );
};

export default EvaluationSection;
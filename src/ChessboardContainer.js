import React from 'react';
import { Chessboard } from 'react-chessboard';

const ChessboardContainer = ({ 
  fen, 
  onDrop, 
  boardOrientation, 
  lastMove 
}) => {
  return (
    <div className="chessboard-container-wrapper">
      <div className="chessboard-container">
        <Chessboard
          id="graphite-chessboard"
          options={{
            position: fen,
            onPieceDrop: onDrop,
            boardOrientation: boardOrientation,
            animationDuration: 300,
            arePiecesDraggable: true,
            customDarkSquareStyle: { backgroundColor: 'var(--board-dark)' },
            customLightSquareStyle: { backgroundColor: 'var(--board-light)' },
            customBoardStyle: {
              borderRadius: '6px',
              boxShadow: `0 5px 15px var(--shadow-color)`,
            },
            customArrows: lastMove ? [[lastMove.from, lastMove.to, 'var(--accent-primary)']] : [],
          }}
        />
      </div>
    </div>
  );
};

export default ChessboardContainer;
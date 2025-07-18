import React, { useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';

const ChessboardContainer = ({ 
  fen, 
  onDrop, 
  boardOrientation, 
  lastMove,
  isAutoMoveEnabled,
  makeAutoOpponentMove,
  userColor // New prop for user's playing color
}) => {
  const prevFenRef = useRef(fen);

  useEffect(() => {
    // Only run if the FEN has changed and auto-move is enabled.
    if (isAutoMoveEnabled && fen !== prevFenRef.current) {
      const turn = fen.split(' ')[1];
      const playerIsWhite = userColor === 'white'; // Use userColor to determine player's side
      const isOpponentTurn = (playerIsWhite && turn === 'b') || (!playerIsWhite && turn === 'w');

      if (isOpponentTurn) {
        // Delay the engine's move to feel more natural
        const timerId = setTimeout(() => {
          makeAutoOpponentMove(); // Changed from calculateNextMove
        }, 500);

        return () => clearTimeout(timerId);
      }
    }
    // Update the ref for the next render
    prevFenRef.current = fen;
  }, [fen, isAutoMoveEnabled, makeAutoOpponentMove, userColor]);

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
            allowDragOffBoard: false,
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

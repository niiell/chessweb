import React from 'react';
import { motion } from 'framer-motion';
import { Chessboard } from 'react-chessboard';

const ChessboardContainer = ({ 
  fen, 
  onDrop, 
  handleSquareClick, 
  boardOrientation, 
  lastMove, 
  rotateX, 
  rotateY 
}) => {
  return (
    <motion.div
      className="chessboard-container"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut", delay: 0.8 } },
      }}
      style={{
        rotateX: rotateX,
        rotateY: rotateY,
        transformStyle: "preserve-3d",
      }}
    >
      {console.log("Rendering Chessboard with FEN:", fen, "and Orientation:", boardOrientation)}
      <Chessboard
        id="my-chessboard"
        position={fen}
        onPieceDrop={onDrop}
        onSquareClick={handleSquareClick}
        boardOrientation={boardOrientation}
        allowDrag={true}
        boardWidth={560}
        animationDuration={800} // Smooth move animation
        arePiecesDraggable={true}
        customPieceFn={(piece, size) => (
          <motion.div
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ width: size, height: size, backgroundImage: `url(${process.env.PUBLIC_URL}/assets/pieces/webp/${piece}.webp)`, backgroundSize: 'contain' }}
          />
        )}
        customDarkSquareStyle={{ backgroundColor: 'var(--board-dark-square)' }}
        customLightSquareStyle={{ backgroundColor: 'var(--board-light-square)' }}
        boardBorderRadius={8}
        customArrows={lastMove ? [[lastMove.from, lastMove.to]] : []}
      />
    </motion.div>
  );
};

export default ChessboardContainer;

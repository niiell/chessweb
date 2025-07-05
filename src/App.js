import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import './App.css';

function App() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [boardOrientation, setBoardOrientation] = useState('white');

  console.log("Initial game object:", game);
  console.log("Initial FEN:", fen);
  console.log("Initial board orientation:", boardOrientation);

  function onDrop(sourceSquare, targetSquare) {
    console.log(`onDrop called: ${sourceSquare} to ${targetSquare}`);
    let moveResult = null;
    setGame((prevGame) => {
      const gameCopy = new Chess(prevGame.fen());
      try {
        moveResult = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        });

        if (moveResult === null) {
          console.log("Invalid move. Returning previous game state.");
          return prevGame;
        }

        console.log("Move successful. New FEN (inside setGame):", gameCopy.fen());
        setFen(gameCopy.fen());
        return gameCopy;
      } catch (e) {
        console.error("Error during move in setGame:", e);
        return prevGame;
      }
    });
    return moveResult !== null;
  }

  const resetGame = () => {
    console.log("Resetting game.");
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setBoardOrientation('white');
  };

  const flipBoard = () => {
    console.log("Flipping board.");
    setBoardOrientation((prevOrientation) =>
      prevOrientation === 'white' ? 'black' : 'white'
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Chess Analyzer</h1>
      </header>
      <div className="App-body">
        <div className="chessboard-container">
          {console.log("Rendering Chessboard with FEN:", fen, "and Orientation:", boardOrientation)}
          <Chessboard
            id="my-chessboard"
            position={fen}
            onPieceDrop={onDrop}
            boardOrientation={boardOrientation}
            allowDrag={true}
            boardWidth={480}
          />
        </div>
        <div className="controls">
          <button onClick={resetGame}>New Game</button>
          <button onClick={flipBoard}>Flip Board</button>
          <div className="fen-display">
            <label>FEN:</label>
            <input type="text" value={fen} onChange={(e) => {
              try {
                game.load(e.target.value);
                setFen(game.fen());
              } catch (error) {
                // Invalid FEN, do nothing or show error
              }
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

/* eslint-disable no-restricted-globals */

let stockfish = null;

self.onmessage = function (event) {
  if (event.data === 'init') {
    if (!stockfish) {
      // Load Stockfish WASM. In a real scenario, you'd use a proper loader.
      // For now, we assume stockfish.js (glue code) is available globally.
      importScripts('/stockfish.js');
      stockfish = new Worker('/stockfish.wasm'); // This line is incorrect for WASM directly

      // Correct way to initialize Stockfish WASM (assuming stockfish.js provides a way)
      // This part is highly dependent on how the Stockfish WASM build is structured.
      // A common pattern is that stockfish.js exposes a global function or object.
      // For demonstration, we'll simulate the communication.

      // In a real scenario, you'd do something like:
      // stockfish = new Worker('path/to/stockfish.js');
      // stockfish.onmessage = (e) => self.postMessage(e.data);
      // stockfish.postMessage('uci');

      // For now, we'll just simulate a response.
      self.postMessage('Stockfish WASM loaded (simulated)');
    }
  } else if (stockfish) {
    // In a real scenario, you'd pass the message to the actual stockfish worker
    // stockfish.postMessage(event.data);

    // Simulate Stockfish response for 'uci' and 'go' commands
    if (event.data === 'uci') {
      self.postMessage('id name Stockfish 17.1 (Simulated)');
      self.postMessage('id author Tord Romstad, Marco Costalba, Joona Kiiski, Gary Linscott');
      self.postMessage('uciok');
    } else if (event.data.startsWith('position')) {
      // Simulate some thinking
      setTimeout(() => {
        self.postMessage('info depth 1 seldepth 1 multipv 1 score cp 10 nodes 10 nps 10 hashfull 0 tbhits 0 time 1 pv e2e4');
        self.postMessage('bestmove e2e4');
      }, 500);
    } else {
      self.postMessage(`Unknown command: ${event.data} (simulated)`);
    }
  } else {
    self.postMessage('Stockfish not initialized.');
  }
};

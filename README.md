# ChessWeb

ChessWeb is a web-based chess application that allows users to play against a powerful chess engine, analyze positions, and explore game variations. It features a clean, modern interface built with React and a Node.js backend for seamless communication with UCI-compatible chess engines.

## Features

*   **Interactive Chessboard:** Play moves, undo/redo, and reset games.
*   **Engine Integration:** Connects to UCI-compatible chess engines (e.g., Stockfish) for analysis and opponent moves.
*   **Engine Selection:** Easily switch between different chess engines located in the `chessengines` directory.
*   **Configurable Engine Settings:** Adjust parameters like analysis depth, movetime, CPU threads, and hash size.
*   **Syzygy Tablebase Support:** Utilizes Syzygy tablebases for accurate endgame analysis (requires tablebases to be present).
*   **FEN/PGN Support:** Import and export game positions using FEN (Forsyth-Edwards Notation) and PGN (Portable Game Notation).
*   **Auto-Move Opponent:** Enable the engine to automatically make moves for the opponent.
*   **Board Orientation:** Flip the board to view from white's or black's perspective.
*   **Real-time Evaluation Bar:** Visual representation of the engine's evaluation.

## Technologies Used

*   **Frontend:** React.js, HTML, CSS
*   **Backend:** Node.js, Express.js, Socket.IO
*   **Chess Logic:** `chess.js` library
*   **Chess Engine Communication:** `child_process` (Node.js)
*   **Styling:** Custom CSS

## Setup and Installation

Follow these steps to get ChessWeb up and running on your local machine.

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (Node Package Manager)

### 1. Clone the Repository

```bash
git clone https://github.com/niiell/chessweb.git
cd chessweb
```

### 2. Install Dependencies

Install dependencies for both the frontend and backend:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Place Chess Engines

Place your UCI-compatible chess engine executables (e.g., `.exe` files for Windows) into the `chessengines/` directory. The application is configured to look for engines in this folder.

### 4. (Optional) Setup Syzygy Tablebases

If you wish to use Syzygy tablebases for enhanced endgame analysis, download them and place them in the `syzygy_tablebases/` directory. The current configuration expects them in `syzygy_tablebases/3-4-5 2022`.

### 5. Start the Backend Server

Navigate to the project root and start the backend server:

```bash
cd backend
node server.js &
cd ..
```
*Note: The `&` at the end runs the server in the background. On Windows, you might need to use `start node server.js` or run it in a separate terminal window.*

### 6. Start the Frontend Development Server

From the project root, start the React development server:

```bash
npm start
```

This will open the application in your browser, usually at `http://localhost:3000`.

## Usage

*   **Playing Moves:** Click on a piece and then click on the target square to make a move.
*   **Engine Selection:** Use the dropdown menu in the controls panel to select your preferred chess engine.
*   **Engine Settings:** Adjust the engine's analysis parameters (movetime, depth, threads, hash size) using the controls.
*   **FEN/PGN:** Use the FEN and PGN buttons to import or export game data.
*   **Auto-Move:** Toggle the "Auto-move Opponent" checkbox to have the engine play for the opposing side.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

[Specify your license here, e.g., MIT License]
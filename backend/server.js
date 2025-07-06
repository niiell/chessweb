// Backend server for Stockfish communication

const { spawn } = require('child_process');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000", // Allow your React app to connect
        methods: ["GET", "POST"]
    }
});
const port = 3001; 

app.use(cors()); // Use CORS middleware
app.use(express.json()); 

const STOCKFISH_PATH = '../stockfish/stockfish-windows-x86-64-avx2.exe'; 

let stockfishProcess;
let latestStockfishOutput = ''; 
let outputBuffer = ''; // New buffer for incomplete lines

function startStockfish() {
    stockfishProcess = spawn(STOCKFISH_PATH);

    stockfishProcess.stdout.on('data', (data) => {        outputBuffer += data.toString(); // Add new data to buffer        const lines = outputBuffer.split('\n'); // Split by newline        outputBuffer = lines.pop(); // Keep the last (potentially incomplete) line in buffer        lines.forEach(line => {            const trimmedLine = line.trim();            if (!trimmedLine) return; // Skip empty lines            console.log(`Stockfish stdout (processed): ${trimmedLine}`); // Log processed line            latestStockfishOutput = trimmedLine;             // Parse Stockfish output and emit via WebSocket            if (trimmedLine.startsWith('info')) {                const matchScore = trimmedLine.match(/score (cp|mate) (-?\d+)/);                const matchPv = trimmedLine.match(/pv (.+)/);                const matchDepth = trimmedLine.match(/depth (\d+)/);                const parsedOutput = {                    type: 'info',                    raw: trimmedLine,                    score: matchScore ? { type: matchScore[1], value: parseInt(matchScore[2], 10) } : null,                    pv: matchPv ? matchPv[1].split(' ') : [],                    depth: matchDepth ? parseInt(matchDepth[1], 10) : null,                };                io.emit('stockfish_output', parsedOutput);                // If there's an active analysis promise, resolve it with the score                if (analysisResolve && matchScore) {                    analysisResolve({ score: parsedOutput.score });                    analysisResolve = null; // Clear the resolve function                    analysisReject = null; // Clear the reject function                }            } else if (trimmedLine.startsWith('bestmove')) {                const move = trimmedLine.split(' ')[1];                const ponder = trimmedLine.split(' ')[3] || null;                io.emit('stockfish_output', { type: 'bestmove', move, ponder, raw: trimmedLine });                console.log('Emitted bestmove via WebSocket:', { type: 'bestmove', move, ponder, raw: trimmedLine });            } else {                // For other outputs like 'uciok', 'readyok', etc.                io.emit('stockfish_output', { type: 'raw', raw: trimmedLine });            }        });    })

    stockfishProcess.stderr.on('data', (data) => {
        console.error(`Stockfish stderr: ${data}`);
        io.emit('stockfish_error', data.toString());
    });

    stockfishProcess.on('close', (code) => {
        console.log(`Stockfish process exited with code ${code}`);
        io.emit('stockfish_status', { status: 'closed', code });
    });

    stockfishProcess.on('error', (err) => {
        console.error('Failed to start Stockfish process:', err);
        io.emit('stockfish_status', { status: 'error', message: err.message });
    });

    stockfishProcess.stdin.write('uci\n');
    // Configure Syzygy Tablebases (YOU MUST REPLACE <PATH_TO_YOUR_SYZYGY_TABLEBASES>)
    // Download Syzygy tablebases and place them in a directory, then provide the absolute path.
    // Example: stockfishProcess.stdin.write('setoption name SyzygyPath value C:/Users/Admin/Documents/chessweb/syzygy_tablebases/\n');
    stockfishProcess.stdin.write(`setoption name SyzygyPath value "../syzygy_tablebases/3-4-5 2022/"
`);
    stockfishProcess.stdin.write('setoption name Use Syzygy value true\n');
    stockfishProcess.stdin.write('isready\n');
}

app.post('/command', (req, res) => {
    const { command } = req.body;
    if (stockfishProcess && command) {
        stockfishProcess.stdin.write(`${command}\n`);
        res.status(200).send({ message: 'Command sent to Stockfish' });
    } else {
        res.status(400).send({ message: 'Invalid command or Stockfish not running' });
    }
});

let analysisResolve = null;
let analysisReject = null;

// New endpoint for move analysis
app.post('/analyze-move', async (req, res) => {
    const { fen, move } = req.body;

    if (!stockfishProcess) {
        return res.status(500).send({ error: 'Stockfish not running' });
    }

    // Clear previous analysis promises
    analysisResolve = null;
    analysisReject = null;

    try {
        // Set up a promise to wait for the analysis result
        const analysisPromise = new Promise((resolve, reject) => {
            analysisResolve = resolve;
            analysisReject = reject;
        });

        // Send commands to Stockfish
        stockfishProcess.stdin.write(`position fen ${fen} moves ${move}\n`);
        stockfishProcess.stdin.write(`go depth 15\n`); // Request analysis after the move

        const result = await analysisPromise;
        res.status(200).send(result);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.post('/set-option', (req, res) => {
    const { name, value } = req.body;
    if (stockfishProcess && name && value !== undefined) {
        stockfishProcess.stdin.write(`setoption name ${name} value ${value}\n`);
        res.status(200).send({ message: `Option ${name} set to ${value}` });
    } else {
        res.status(400).send({ message: 'Invalid option name or value' });
    }
});

// Modify stockfishProcess.stdout.on('data') to handle analysis responses
// This part needs to be manually inserted into the existing stdout handler
// within the startStockfish function.
// I will provide the full updated startStockfish function in the next step.


// No longer need a GET /output endpoint as we use WebSockets

startStockfish();

server.listen(port, () => {
    console.log(`Stockfish backend server listening at http://localhost:${port}`);
    console.log('Waiting for Stockfish output...');
});

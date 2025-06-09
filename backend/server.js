// Required modules
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Load slides manifest
const slidesPath = path.join(__dirname, 'slides.json');
let slides = [];
try {
  slides = JSON.parse(fs.readFileSync(slidesPath, 'utf-8'));
} catch (e) {
  console.error('Failed to load slides.json:', e);
  process.exit(1);
}

// Speaker token management
const envPath = path.join(__dirname, '../.env');
let envContent = '';
let tokens = [];
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
  tokens = envContent.match(/^SPEAKER_TOKEN=.*$/gm) || [];
}
if (!process.env.SPEAKER_TOKEN && tokens.length === 0) {
  const token = crypto.randomBytes(32).toString('hex');
  fs.appendFileSync(envPath, `\nSPEAKER_TOKEN=${token}\n`);
  process.env.SPEAKER_TOKEN = token;
  console.log('Generated speaker token:', token);
} else if (tokens.length > 1) {
  // Keep only the last token
  const lastToken = tokens[tokens.length - 1];
  const cleaned = envContent.replace(/^SPEAKER_TOKEN=.*$/gm, '').trim() + `\n${lastToken}\n`;
  fs.writeFileSync(envPath, cleaned);
  process.env.SPEAKER_TOKEN = lastToken.split('=')[1];
  console.warn('Warning: Multiple SPEAKER_TOKEN entries found in .env. Cleaned up to keep only the last one.');
  console.log('Using speaker token:', process.env.SPEAKER_TOKEN);
} else if (tokens.length === 1) {
  process.env.SPEAKER_TOKEN = tokens[0].split('=')[1];
  console.log('Using speaker token:', process.env.SPEAKER_TOKEN);
}
const SPEAKER_TOKEN = process.env.SPEAKER_TOKEN;

// In-memory state
let currentSlideIndex = 0;
let pollStates = {}; // { pollId: { open: bool, votes: { option: count }, voters: Set } }

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(cookieParser());

// Session middleware for voting
function getSessionId(req, res) {
  let sid = req.cookies['poll_session'];
  if (!sid) {
    sid = crypto.randomBytes(16).toString('hex');
    res.cookie('poll_session', sid, { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 });
  }
  return sid;
}

// Rate limiting middleware for voting
const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 votes per minute per IP
  message: { error: 'Too many votes from this IP, please try again later.' }
});

// API: Get slides manifest
app.get('/api/slides', (req, res) => {
  res.json(slides);
});

// API: Vote on poll
app.post('/api/vote', voteLimiter, (req, res) => {
  const { pollId, option } = req.body;
  if (!pollId || !option) return res.status(400).json({ error: 'Invalid vote' });
  if (!pollStates[pollId] || !pollStates[pollId].open) return res.status(403).json({ error: 'Poll not open' });
  const sid = getSessionId(req, res);
  pollStates[pollId].voters = pollStates[pollId].voters || new Set();
  if (pollStates[pollId].voters.has(sid)) {
    return res.status(403).json({ error: 'You have already voted on this poll.' });
  }
  pollStates[pollId].voters.add(sid);
  pollStates[pollId].votes[option] = (pollStates[pollId].votes[option] || 0) + 1;
  broadcastPollUpdate(pollId);
  res.json({ success: true });
});

// WebSocket: Real-time updates
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'INIT', currentSlideIndex, slides, pollStates }));
  let authErrorSent = false;
  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }
    // Speaker actions
    if (data.token) {
      if (data.token !== SPEAKER_TOKEN) {
        if (!authErrorSent) {
          ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Invalid speaker token' }));
          authErrorSent = true;
        }
        return;
      }
    }
    if (data.token === SPEAKER_TOKEN) {
      if (data.type === 'NEXT_SLIDE') {
        if (currentSlideIndex < slides.length - 1) currentSlideIndex++;
        broadcastSlideChange();
      } else if (data.type === 'PREV_SLIDE') {
        if (currentSlideIndex > 0) currentSlideIndex--;
        broadcastSlideChange();
      } else if (data.type === 'OPEN_POLL') {
        const pollId = data.pollId;
        if (!pollStates[pollId]) {
          pollStates[pollId] = { open: true, votes: {}, voters: new Set() };
        } else {
          pollStates[pollId].open = true;
        }
        broadcastPollUpdate(pollId);
      } else if (data.type === 'CLOSE_POLL') {
        const pollId = data.pollId;
        if (pollStates[pollId]) pollStates[pollId].open = false;
        broadcastPollUpdate(pollId);
      }
    }
  });
});

function broadcastSlideChange() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'SLIDE_CHANGE', currentSlideIndex }));
    }
  });
}

function broadcastPollUpdate(pollId) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'POLL_UPDATE', pollId, pollState: pollStates[pollId] }));
    }
  });
}

// Helper: get poll by slug
function getPollBySlug(slug) {
  return slides.find(s => s.type === 'poll' && s.slug === slug);
}

// Serve voting page for /vote/:slug
app.get('/vote/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/vote.html'));
});

// API: Get poll info by slug
app.get('/api/poll/:slug', (req, res) => {
  const poll = getPollBySlug(req.params.slug);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  // Hide votes/voters in this API
  res.json({ pollId: poll.pollId, question: poll.question, options: poll.options, slug: poll.slug });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 
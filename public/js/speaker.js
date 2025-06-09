let ws;
let slides = [];
let currentSlideIndex = 0;
let pollStates = {};
let speakerToken = localStorage.getItem('speakerToken') || prompt('Enter speaker token:');
localStorage.setItem('speakerToken', speakerToken);
let controlsEnabled = false;

function setControlsEnabled(enabled) {
  controlsEnabled = enabled;
  document.getElementById('next-btn').disabled = !enabled;
  document.getElementById('prev-btn').disabled = !enabled;
  document.getElementById('open-poll-btn').disabled = !enabled;
  document.getElementById('close-poll-btn').disabled = !enabled;
}

function showAuthError(msg) {
  alert(msg || 'Invalid speaker token. Please try again.');
  localStorage.removeItem('speakerToken');
  speakerToken = prompt('Enter speaker token:');
  if (speakerToken) {
    localStorage.setItem('speakerToken', speakerToken);
    connectWS();
  }
}

function renderPollResults(slide, pollState) {
  const resultsArea = document.getElementById('poll-results');
  if (!pollState || !pollState.votes) {
    resultsArea.style.display = 'none';
    return;
  }
  resultsArea.innerHTML = '';
  resultsArea.style.display = '';
  const totalVotes = Object.values(pollState.votes).reduce((a, b) => a + b, 0);
  slide.options.forEach(option => {
    const count = pollState.votes[option] || 0;
    const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
    const bar = document.createElement('div');
    bar.style.margin = '0.5em 0';
    bar.innerHTML = `<strong>${option}:</strong> ${count} (${percent}%)<div style='background:#007bff;height:12px;width:${percent}%;border-radius:4px;'></div>`;
    resultsArea.appendChild(bar);
  });
  const total = document.createElement('div');
  total.style.marginTop = '1em';
  total.textContent = `Total votes: ${totalVotes}`;
  resultsArea.appendChild(total);
}

function loadSlide(index) {
  const slide = slides[index];
  fetch(slide.path)
    .then(res => res.text())
    .then(html => {
      document.getElementById('slide-container').innerHTML = html;
      document.getElementById('slide-number').textContent = `Slide ${index + 1} of ${slides.length}`;
      if (slide.type === 'poll') {
        document.getElementById('poll-controls').style.display = '';
        renderPollResults(slide, pollStates[slide.pollId]);
      } else {
        document.getElementById('poll-controls').style.display = 'none';
        document.getElementById('poll-results').style.display = 'none';
      }
    });
}

function connectWS() {
  if (ws) ws.close();
  setControlsEnabled(false);
  ws = new WebSocket(`ws://${window.location.host}`);
  ws.onopen = () => {
    // Optionally send auth on open
  };
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'INIT') {
      slides = msg.slides;
      currentSlideIndex = msg.currentSlideIndex;
      pollStates = msg.pollStates;
      loadSlide(currentSlideIndex);
      setControlsEnabled(true);
    } else if (msg.type === 'SLIDE_CHANGE') {
      currentSlideIndex = msg.currentSlideIndex;
      loadSlide(currentSlideIndex);
    } else if (msg.type === 'POLL_UPDATE') {
      pollStates[msg.pollId] = msg.pollState;
      // Update poll results UI if on this poll slide
      const slide = slides[currentSlideIndex];
      if (slide && slide.type === 'poll' && slide.pollId === msg.pollId) {
        renderPollResults(slide, pollStates[msg.pollId]);
      }
    } else if (msg.type === 'AUTH_ERROR') {
      setControlsEnabled(false);
      showAuthError(msg.message);
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  connectWS();
  document.getElementById('next-btn').onclick = () => {
    if (!controlsEnabled) return;
    ws.send(JSON.stringify({ type: 'NEXT_SLIDE', token: speakerToken }));
  };
  document.getElementById('prev-btn').onclick = () => {
    if (!controlsEnabled) return;
    ws.send(JSON.stringify({ type: 'PREV_SLIDE', token: speakerToken }));
  };
  document.getElementById('open-poll-btn').onclick = () => {
    if (!controlsEnabled) return;
    const slide = slides[currentSlideIndex];
    if (slide.type === 'poll') {
      ws.send(JSON.stringify({ type: 'OPEN_POLL', pollId: slide.pollId, token: speakerToken }));
    }
  };
  document.getElementById('close-poll-btn').onclick = () => {
    if (!controlsEnabled) return;
    const slide = slides[currentSlideIndex];
    if (slide.type === 'poll') {
      ws.send(JSON.stringify({ type: 'CLOSE_POLL', pollId: slide.pollId, token: speakerToken }));
    }
  };
}); 
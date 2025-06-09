let ws;
let slides = [];
let currentSlideIndex = 0;
let pollStates = {};
let liveMode = true;

function getPollVoteKey(pollId) {
  return `voted_${pollId}`;
}

function renderPollResults(slide, pollState, container) {
  if (!pollState || !pollState.votes) {
    container.style.display = 'none';
    return;
  }
  container.innerHTML = '';
  container.style.display = '';
  const totalVotes = Object.values(pollState.votes).reduce((a, b) => a + b, 0);
  slide.options.forEach(option => {
    const count = pollState.votes[option] || 0;
    const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
    const bar = document.createElement('div');
    bar.style.margin = '0.5em 0';
    bar.innerHTML = `<strong>${option}:</strong> ${count} (${percent}%)<div style='background:#007bff;height:12px;width:${percent}%;border-radius:4px;'></div>`;
    container.appendChild(bar);
  });
  const total = document.createElement('div');
  total.style.marginTop = '1em';
  total.textContent = `Total votes: ${totalVotes}`;
  container.appendChild(total);
}

function renderPoll(slide, pollState) {
  const pollArea = document.getElementById('poll-area');
  pollArea.innerHTML = '';
  pollArea.style.display = '';
  const voted = localStorage.getItem(getPollVoteKey(slide.pollId));

  // Question
  const q = document.createElement('h3');
  q.textContent = slide.question;
  pollArea.appendChild(q);

  // Options
  if (!voted && pollState && pollState.open) {
    slide.options.forEach(option => {
      const btn = document.createElement('button');
      btn.textContent = option;
      btn.onclick = () => voteOnPoll(slide.pollId, option);
      pollArea.appendChild(btn);
    });
  } else if (voted) {
    const msg = document.createElement('div');
    msg.textContent = 'You have already voted.';
    pollArea.appendChild(msg);
    // Show results if available
    if (pollState && pollState.votes) {
      renderPollResults(slide, pollState, pollArea);
    }
  } else if (pollState && !pollState.open) {
    const msg = document.createElement('div');
    msg.textContent = 'Poll is closed.';
    pollArea.appendChild(msg);
    // Show results if available
    if (pollState && pollState.votes) {
      renderPollResults(slide, pollState, pollArea);
    }
  }

  // QR code and direct URL
  const qrArea = document.getElementById('qr-area');
  qrArea.innerHTML = '';
  qrArea.style.display = '';
  const pollUrl = slide.slug ? `${window.location.origin}/vote/${slide.slug}` : `${window.location.origin}/?poll=${slide.pollId}`;
  const urlDiv = document.createElement('div');
  urlDiv.textContent = `Vote at: ${pollUrl}`;
  qrArea.appendChild(urlDiv);
  const qrDiv = document.createElement('div');
  qrArea.appendChild(qrDiv);
  if (window.QRCode) {
    new QRCode(qrDiv, { text: pollUrl, width: 128, height: 128 });
  }
}

function voteOnPoll(pollId, option) {
  fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pollId, option })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem(getPollVoteKey(pollId), '1');
        loadSlide(currentSlideIndex);
      } else {
        alert(data.error || 'Vote failed.');
      }
    })
    .catch(() => alert('Vote failed.'));
}

function loadSlide(index) {
  const slide = slides[index];
  fetch(slide.path)
    .then(res => res.text())
    .then(html => {
      document.getElementById('slide-container').innerHTML = html;
      if (slide.type === 'poll') {
        renderPoll(slide, pollStates[slide.pollId]);
      } else {
        document.getElementById('poll-area').style.display = 'none';
        document.getElementById('qr-area').style.display = 'none';
      }
    });
}

function setLiveMode(isLive) {
  liveMode = isLive;
  document.getElementById('mode-indicator').textContent = liveMode ? 'Live Mode' : 'Static Mode';
  document.getElementById('nav-buttons').style.display = liveMode ? 'none' : '';
}

function gotoSlide(index) {
  if (index < 0 || index >= slides.length) return;
  currentSlideIndex = index;
  loadSlide(currentSlideIndex);
}

function handleWSError() {
  setLiveMode(false);
  alert('Lost connection to server. Switched to static mode.');
}

function connectWS() {
  ws = new WebSocket(`ws://${window.location.host}`);
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'INIT') {
      slides = msg.slides;
      currentSlideIndex = msg.currentSlideIndex;
      pollStates = msg.pollStates;
      setLiveMode(true);
      loadSlide(currentSlideIndex);
    } else if (msg.type === 'SLIDE_CHANGE') {
      if (liveMode) {
        currentSlideIndex = msg.currentSlideIndex;
        loadSlide(currentSlideIndex);
      }
    } else if (msg.type === 'POLL_UPDATE') {
      pollStates[msg.pollId] = msg.pollState;
      const slide = slides[currentSlideIndex];
      if (slide && slide.type === 'poll' && slide.pollId === msg.pollId) {
        renderPoll(slide, pollStates[msg.pollId]);
      }
    }
  };
  ws.onerror = handleWSError;
  ws.onclose = handleWSError;
}

document.addEventListener('DOMContentLoaded', () => {
  connectWS();
  // Static mode navigation
  document.getElementById('nav-buttons').style.display = 'none';
  document.getElementById('prev-btn').onclick = () => gotoSlide(currentSlideIndex - 1);
  document.getElementById('next-btn').onclick = () => gotoSlide(currentSlideIndex + 1);
  // Toggle live/static mode
  document.getElementById('mode-indicator').onclick = () => {
    setLiveMode(!liveMode);
  };
}); 
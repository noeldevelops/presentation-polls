function getSlug() {
  const match = window.location.pathname.match(/\/vote\/(.+)$/);
  return match ? match[1] : null;
}

function getPollVoteKey(pollId) {
  return `voted_${pollId}`;
}

function renderPoll(poll) {
  const container = document.getElementById('vote-container');
  container.innerHTML = '';
  const voted = localStorage.getItem(getPollVoteKey(poll.pollId));

  const q = document.createElement('h2');
  q.textContent = poll.question;
  container.appendChild(q);

  if (!voted) {
    poll.options.forEach(option => {
      const btn = document.createElement('button');
      btn.textContent = option;
      btn.onclick = () => voteOnPoll(poll.pollId, option);
      container.appendChild(btn);
    });
  } else {
    const msg = document.createElement('div');
    msg.textContent = 'You have already voted.';
    container.appendChild(msg);
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
        document.getElementById('vote-container').innerHTML = '<div>Thank you for voting!</div>';
      } else {
        alert(data.error || 'Vote failed.');
      }
    })
    .catch(() => alert('Vote failed.'));
}

document.addEventListener('DOMContentLoaded', () => {
  const slug = getSlug();
  if (!slug) {
    document.getElementById('vote-container').textContent = 'Invalid poll URL.';
    return;
  }
  fetch(`/api/poll/${slug}`)
    .then(res => res.json())
    .then(poll => {
      if (poll.error) {
        document.getElementById('vote-container').textContent = 'Poll not found.';
      } else {
        renderPoll(poll);
      }
    })
    .catch(() => {
      document.getElementById('vote-container').textContent = 'Failed to load poll.';
    });
}); 
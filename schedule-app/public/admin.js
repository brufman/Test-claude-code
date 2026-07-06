const keyInput = document.getElementById('admin-key');
const unlockBtn = document.getElementById('unlock-btn');
const keyMsg = document.getElementById('key-msg');
const requestsCard = document.getElementById('requests-card');
const requestsList = document.getElementById('requests-list');

let adminKey = sessionStorage.getItem('adminKey') || '';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function fmtTime(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

async function loadRequests() {
  const res = await fetch('/api/admin/requests', {
    headers: { 'x-admin-key': adminKey },
  });

  if (res.status === 401) {
    sessionStorage.removeItem('adminKey');
    adminKey = '';
    requestsCard.style.display = 'none';
    keyMsg.textContent = 'Invalid admin key.';
    keyMsg.className = 'msg error';
    return;
  }

  requestsCard.style.display = 'block';
  const requests = await res.json();

  if (requests.length === 0) {
    requestsList.innerHTML = '<div class="empty">No requests yet.</div>';
    return;
  }

  requestsList.innerHTML = '';
  requests.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'request-item';

    const actions =
      r.status === 'pending'
        ? `<div class="actions">
             <button data-action="approve" data-id="${r.id}">Approve</button>
             <button data-action="reject" data-id="${r.id}" class="secondary">Reject</button>
           </div>`
        : `<span class="badge ${r.status}">${r.status}</span>`;

    row.innerHTML = `
      <div class="request-main">
        <div class="request-title">${escapeHtml(r.name)} · ${escapeHtml(r.date)} · ${fmtTime(r.startTime)} – ${fmtTime(r.endTime)}</div>
        <div class="request-sub">${escapeHtml(r.email)}</div>
        ${r.note ? `<div class="request-note">${escapeHtml(r.note)}</div>` : ''}
      </div>
      ${actions}
    `;
    requestsList.appendChild(row);
  });
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  const res = await fetch(`/api/admin/requests/${id}/${action}`, {
    method: 'POST',
    headers: { 'x-admin-key': adminKey },
  });
  if (res.status === 409) {
    const data = await res.json();
    if (data.error === 'conflict') {
      alert('This overlaps with an already-approved slot. Reject or adjust before approving.');
    }
  }
  loadRequests();
});

unlockBtn.addEventListener('click', () => {
  adminKey = keyInput.value.trim();
  sessionStorage.setItem('adminKey', adminKey);
  keyMsg.textContent = '';
  loadRequests();
});

keyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') unlockBtn.click();
});

if (adminKey) {
  keyInput.value = adminKey;
  loadRequests();
}

const form = document.getElementById('request-form');
const formMsg = document.getElementById('form-msg');
const dateInput = document.getElementById('date');
const busyList = document.getElementById('busy-list');
const lookupEmail = document.getElementById('lookup-email');
const lookupBtn = document.getElementById('lookup-btn');
const myRequests = document.getElementById('my-requests');

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

async function loadBusySlots() {
  if (!dateInput.value) {
    busyList.textContent = 'Pick a date above to see booked times.';
    return;
  }
  const res = await fetch('/api/slots');
  const slots = await res.json();
  const forDate = slots.filter((s) => s.date === dateInput.value);
  if (forDate.length === 0) {
    busyList.textContent = 'Nothing booked yet on this date.';
    return;
  }
  busyList.innerHTML = '';
  forDate
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .forEach((s) => {
      const row = document.createElement('div');
      row.className = 'request-item';
      row.innerHTML = `<div class="request-main">${fmtTime(s.startTime)} – ${fmtTime(s.endTime)}</div><span class="badge approved">Booked</span>`;
      busyList.appendChild(row);
    });
}

dateInput.addEventListener('change', loadBusySlots);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formMsg.textContent = '';
  formMsg.className = 'msg';

  const body = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    date: form.date.value,
    startTime: form.startTime.value,
    endTime: form.endTime.value,
    note: form.note.value.trim(),
  };

  if (body.startTime >= body.endTime) {
    formMsg.textContent = 'End time must be after start time.';
    formMsg.classList.add('error');
    return;
  }

  const res = await fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    formMsg.textContent = 'Could not submit request. Check the form and try again.';
    formMsg.classList.add('error');
    return;
  }

  formMsg.textContent = 'Request sent — waiting for approval.';
  formMsg.classList.add('success');
  form.reset();
  lookupEmail.value = body.email;
  loadMyRequests();
  loadBusySlots();
});

function statusBadge(status) {
  return `<span class="badge ${status}">${status}</span>`;
}

async function loadMyRequests() {
  const email = lookupEmail.value.trim();
  if (!email) {
    myRequests.innerHTML = '<div class="empty">Enter your email to see your requests.</div>';
    return;
  }
  const res = await fetch(`/api/requests?email=${encodeURIComponent(email)}`);
  const requests = await res.json();
  if (requests.length === 0) {
    myRequests.innerHTML = '<div class="empty">No requests found for that email.</div>';
    return;
  }
  myRequests.innerHTML = '';
  requests
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((r) => {
      const row = document.createElement('div');
      row.className = 'request-item';
      row.innerHTML = `
        <div class="request-main">
          <div class="request-title">${escapeHtml(r.date)} · ${fmtTime(r.startTime)} – ${fmtTime(r.endTime)}</div>
          ${r.note ? `<div class="request-note">${escapeHtml(r.note)}</div>` : ''}
        </div>
        ${statusBadge(r.status)}
      `;
      myRequests.appendChild(row);
    });
}

lookupBtn.addEventListener('click', loadMyRequests);
lookupEmail.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadMyRequests();
});

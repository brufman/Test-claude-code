const express = require('express');
const path = require('path');
const store = require('./store');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function requireAdmin(req, res, next) {
  if (req.get('x-admin-key') !== ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

function isValidRequestBody(body) {
  const { name, email, date, startTime, endTime } = body;
  if (!name || !email || !date || !startTime || !endTime) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return false;
  if (startTime >= endTime) return false;
  return true;
}

// Public: approved slots, so requesters can see what's already booked.
app.get('/api/slots', (req, res) => {
  const approved = store
    .listRequests()
    .filter((r) => r.status === 'approved')
    .map(({ date, startTime, endTime }) => ({ date, startTime, endTime }));
  res.json(approved);
});

// Requester submits a time-slot request.
app.post('/api/requests', (req, res) => {
  if (!isValidRequestBody(req.body)) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  const request = store.createRequest(req.body);
  res.status(201).json(request);
});

// Requester checks status of their own requests by email.
app.get('/api/requests', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email_required' });
  const mine = store.listRequests().filter((r) => r.email === email);
  res.json(mine);
});

// Admin: full list, pending first.
app.get('/api/admin/requests', requireAdmin, (req, res) => {
  const all = store.listRequests().sort((a, b) => {
    if (a.status === b.status) return a.createdAt.localeCompare(b.createdAt);
    if (a.status === 'pending') return -1;
    if (b.status === 'pending') return 1;
    return 0;
  });
  res.json(all);
});

app.post('/api/admin/requests/:id/approve', requireAdmin, (req, res) => {
  const result = store.approveRequest(req.params.id);
  if (result.error === 'not_found') return res.status(404).json({ error: result.error });
  if (result.error === 'not_pending') return res.status(409).json({ error: result.error });
  if (result.error === 'conflict') {
    return res.status(409).json({ error: 'conflict', conflictsWith: result.conflictsWith });
  }
  res.json(result.request);
});

app.post('/api/admin/requests/:id/reject', requireAdmin, (req, res) => {
  const result = store.rejectRequest(req.params.id);
  if (result.error === 'not_found') return res.status(404).json({ error: result.error });
  if (result.error === 'not_pending') return res.status(409).json({ error: result.error });
  res.json(result.request);
});

app.listen(PORT, () => {
  console.log(`Schedule app listening on http://localhost:${PORT}`);
});

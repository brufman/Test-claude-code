const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'data', 'requests.json');

function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
  return raw ? JSON.parse(raw) : [];
}

function writeAll(requests) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2));
}

function overlaps(a, b) {
  return a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime;
}

function listRequests() {
  return readAll();
}

function createRequest({ name, email, date, startTime, endTime, note }) {
  const requests = readAll();
  const request = {
    id: crypto.randomUUID(),
    name,
    email,
    date,
    startTime,
    endTime,
    note: note || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  requests.push(request);
  writeAll(requests);
  return request;
}

function findRequest(id) {
  return readAll().find((r) => r.id === id);
}

function approveRequest(id) {
  const requests = readAll();
  const target = requests.find((r) => r.id === id);
  if (!target) return { error: 'not_found' };
  if (target.status !== 'pending') return { error: 'not_pending' };

  const conflictsWith = requests.find(
    (r) => r.id !== id && r.status === 'approved' && overlaps(r, target)
  );
  if (conflictsWith) return { error: 'conflict', conflictsWith };

  target.status = 'approved';
  writeAll(requests);
  return { request: target };
}

function rejectRequest(id) {
  const requests = readAll();
  const target = requests.find((r) => r.id === id);
  if (!target) return { error: 'not_found' };
  if (target.status !== 'pending') return { error: 'not_pending' };

  target.status = 'rejected';
  writeAll(requests);
  return { request: target };
}

module.exports = {
  listRequests,
  createRequest,
  findRequest,
  approveRequest,
  rejectRequest,
};

# Schedule Approval App

A requester picks a date and time slot and submits a request. An admin
reviews pending requests and approves or rejects each one.

## Run it

```bash
cd schedule-app
npm install
ADMIN_KEY=your-secret npm start
```

Then open:

- `http://localhost:3000/` — submit a time-slot request, check status by email
- `http://localhost:3000/admin.html` — enter the admin key, approve/reject requests

If `ADMIN_KEY` isn't set, it defaults to `admin123` (for local testing only).

## How it works

- Requests are stored in `data/requests.json` with a status of `pending`,
  `approved`, or `rejected`.
- Approving a request that overlaps an already-approved slot on the same
  date is blocked, so the schedule can't double-book.
- The admin API requires an `x-admin-key` header matching `ADMIN_KEY`.

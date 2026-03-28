import { Router } from 'express';
import { Resend } from 'resend';
import cron from 'node-cron';
import { google } from 'googleapis';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ─── Google OAuth2 ────────────────────────────────────────────────────────────

function makeOAuth2Client() {
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.SERVER_URL || 'http://localhost:2001'}/api/notifications/google/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

// ─── Email ────────────────────────────────────────────────────────────────────

async function sendEmail(to, subject, text) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: 'FocusFlow <onboarding@resend.dev>',
    to,
    subject,
    text,
  });
  if (error) throw new Error(error.message);
}

// ─── Google Calendar ──────────────────────────────────────────────────────────

function getCalendarClient(refreshToken) {
  const auth = makeOAuth2Client();
  auth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth });
}

const SCHEDULE_SLOTS = {
  morning: { hour: 8,  label: 'Morning Check-in' },
  midday:  { hour: 12, label: 'Midday Check-in'  },
  eod:     { hour: 18, label: 'End of Day Wrap-up' },
};

async function upsertCalendarEvent(calendar, existingEventId, slotKey) {
  const { hour, label } = SCHEDULE_SLOTS[slotKey];
  const start = new Date();
  start.setHours(hour, 0, 0, 0);
  if (start <= new Date()) start.setDate(start.getDate() + 1);
  const end = new Date(start.getTime() + 15 * 60 * 1000);

  const resource = {
    summary: `FocusFlow — ${label}`,
    description: 'Daily productivity check-in from FocusFlow.',
    start: { dateTime: start.toISOString() },
    end:   { dateTime: end.toISOString() },
    recurrence: ['RRULE:FREQ=DAILY'],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 0 },
        { method: 'popup', minutes: 0 },
      ],
    },
  };

  if (existingEventId) {
    try {
      await calendar.events.update({ calendarId: 'primary', eventId: existingEventId, resource });
      return existingEventId;
    } catch { /* event deleted by user — fall through to create */ }
  }

  const res = await calendar.events.insert({ calendarId: 'primary', resource });
  return res.data.id;
}

async function deleteCalendarEvent(calendar, eventId) {
  if (!eventId) return;
  try { await calendar.events.delete({ calendarId: 'primary', eventId }); } catch { /* already gone */ }
}

async function syncCalendarEvents(userId, schedule) {
  const { rows } = await pool.query('SELECT "googleRefreshToken" FROM users WHERE id = $1', [userId]);
  const refreshToken = rows[0]?.googleRefreshToken;
  if (!refreshToken) return {};

  const calendar = getCalendarClient(refreshToken);
  const { rows: cfgRows } = await pool.query(
    'SELECT * FROM notification_configs WHERE "userId" = $1',
    [userId]
  );
  const config = cfgRows[0] || {};
  const ids = {};

  for (const slot of ['morning', 'midday', 'eod']) {
    const col = `gcal${slot.charAt(0).toUpperCase() + slot.slice(1)}Id`;
    if (schedule[slot]) {
      ids[col] = await upsertCalendarEvent(calendar, config[col] || null, slot);
    } else {
      await deleteCalendarEvent(calendar, config[col] || null);
      ids[col] = null;
    }
  }

  return ids;
}

// ─── Message builder ──────────────────────────────────────────────────────────

async function buildMessage(userId, label) {
  const { rows: tasks } = await pool.query(
    'SELECT * FROM tasks WHERE "userId" = $1 ORDER BY "sortOrder" ASC',
    [userId]
  );
  const { rows: goals } = await pool.query(
    'SELECT * FROM goals WHERE "userId" = $1 ORDER BY "createdAt" ASC',
    [userId]
  );

  const pending = tasks.filter((t) => t.status === 'pending');
  const done    = tasks.filter((t) => t.status === 'done');
  const blocked = tasks.filter((t) => t.status === 'blocked');
  const focusTime = done.reduce((s, t) => s + (t.duration || 0), 0);

  const lines = [
    `FocusFlow — ${label}`,
    '',
    `Tasks: ${done.length} done / ${pending.length} pending / ${blocked.length} blocked`,
    `Focus time: ${Math.floor(focusTime / 60)}h ${focusTime % 60}m`,
  ];

  if (pending.length > 0) {
    lines.push('', 'Up next:');
    pending.slice(0, 3).forEach((t) => lines.push(`  * ${t.name} (${t.priority}, ${t.duration}min)`));
  }
  if (blocked.length > 0) {
    lines.push('', 'Blocked:');
    blocked.forEach((t) => lines.push(`  * ${t.name}`));
  }
  if (goals.length > 0) {
    lines.push('', 'Goals:');
    goals.forEach((g) => {
      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
      lines.push(`  * ${g.title}: ${g.current}/${g.target} (${pct}%)`);
    });
  }

  return lines.join('\n');
}

// ─── Notify one user ──────────────────────────────────────────────────────────

async function notifyUser(userId, label) {
  const { rows } = await pool.query(
    'SELECT * FROM notification_configs WHERE "userId" = $1',
    [userId]
  );
  const config = rows[0];
  if (!config) return [];

  const text = await buildMessage(userId, label);
  const errors = [];

  if (config.email) {
    try {
      await sendEmail(config.email, `FocusFlow — ${label}`, text);
      console.log(`Email sent to ${config.email}`);
    } catch (e) {
      errors.push(`Email: ${e.message}`);
      console.error('Email error:', e.message);
    }
  }

  return errors;
}

// ─── Notification trigger (used by both internal cron and external cron-job.org) ──

const SLOTS = {
  morning: 'Morning Check-in ☀️',
  midday:  'Midday Check-in 🌤️',
  eod:     'End of Day Wrap-up 🌆',
};

async function triggerSlot(slot) {
  const label = SLOTS[slot];
  if (!label) return;
  const { rows } = await pool.query(
    `SELECT "userId" FROM notification_configs WHERE ${slot} = TRUE`
  );
  for (const { userId } of rows) await notifyUser(userId, label);
  console.log(`Triggered ${slot} notifications for ${rows.length} user(s)`);
}

// ─── Internal cron (fallback, fires if server stays awake) ───────────────────

cron.schedule('0 8  * * *', () => triggerSlot('morning'));
cron.schedule('0 12 * * *', () => triggerSlot('midday'));
cron.schedule('0 18 * * *', () => triggerSlot('eod'));

// ─── Routes ───────────────────────────────────────────────────────────────────

// ─── External cron trigger (called by cron-job.org with a secret header) ────
router.post('/trigger/:slot', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { slot } = req.params;
  if (!SLOTS[slot]) return res.status(400).json({ error: 'Invalid slot. Use morning, midday, or eod.' });
  await triggerSlot(slot);
  res.json({ success: true, slot });
});

router.get('/google/connect', requireAuth, (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not set in .env' });
  }
  const state = Buffer.from(String(req.user.userId)).toString('base64');
  const url = makeOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state,
  });
  res.json({ url });
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = parseInt(Buffer.from(state, 'base64').toString('utf8'), 10);
    const { tokens } = await makeOAuth2Client().getToken(code);
    if (tokens.refresh_token) {
      await pool.query('UPDATE users SET "googleRefreshToken" = $1 WHERE id = $2', [tokens.refresh_token, userId]);
    }
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:7001'}?gcal=connected`);
  } catch (e) {
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:7001'}?gcal=error`);
  }
});

router.get('/google/status', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT "googleRefreshToken" FROM users WHERE id = $1', [req.user.userId]);
  res.json({ connected: !!rows[0]?.googleRefreshToken });
});

router.use(requireAuth);

router.post('/setup', async (req, res) => {
  try {
    const { email, schedule } = req.body;
    const userId = req.user.userId;

    let calIds = {};
    try {
      calIds = await syncCalendarEvents(userId, schedule || {});
    } catch (e) {
      console.error('Calendar sync error:', e.message);
    }

    await pool.query(
      `INSERT INTO notification_configs
         ("userId", email, morning, midday, eod, "gcalMorningId", "gcalMiddayId", "gcalEodId", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT ("userId") DO UPDATE SET
         email = EXCLUDED.email,
         morning = EXCLUDED.morning,
         midday = EXCLUDED.midday,
         eod = EXCLUDED.eod,
         "gcalMorningId" = COALESCE(EXCLUDED."gcalMorningId", notification_configs."gcalMorningId"),
         "gcalMiddayId"  = COALESCE(EXCLUDED."gcalMiddayId",  notification_configs."gcalMiddayId"),
         "gcalEodId"     = COALESCE(EXCLUDED."gcalEodId",     notification_configs."gcalEodId"),
         "updatedAt" = NOW()`,
      [
        userId,
        email || '',
        !!schedule?.morning,
        !!schedule?.midday,
        !!schedule?.eod,
        calIds.gcalMorningId ?? null,
        calIds.gcalMiddayId  ?? null,
        calIds.gcalEodId     ?? null,
      ]
    );

    res.json({ success: true, calendarSynced: Object.keys(calIds).length > 0 });
  } catch (error) {
    console.error('Notifications setup error:', error);
    res.status(500).json({ error: 'Failed to save preferences', message: error.message });
  }
});

router.get('/config', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notification_configs WHERE "userId" = $1',
      [req.user.userId]
    );
    const config = rows[0];
    res.json(
      config
        ? { email: config.email, schedule: { morning: config.morning, midday: config.midday, eod: config.eod } }
        : { email: '', schedule: { morning: false, midday: false, eod: false } }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to get config', message: error.message });
  }
});

router.post('/send-test', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rows } = await pool.query(
      'SELECT * FROM notification_configs WHERE "userId" = $1',
      [userId]
    );
    const config = rows[0];

    if (!config?.email) {
      return res.status(400).json({ error: 'No email saved. Set it up first.' });
    }

    const errors = await notifyUser(userId, 'Test Notification 🧪');
    if (errors.length > 0) {
      return res.status(500).json({ error: 'Notification failed', details: errors });
    }

    res.json({ success: true, message: 'Test email sent!' });
  } catch (error) {
    console.error('Send test error:', error);
    res.status(500).json({ error: 'Failed to send test', message: error.message });
  }
});

export default router;

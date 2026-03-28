import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function serializeTask(t) {
  return {
    id: t.id,
    name: t.name,
    duration: t.duration,
    priority: t.priority,
    status: t.status,
    categories: typeof t.categories === 'string' ? JSON.parse(t.categories) : (t.categories || []),
    description: t.description,
    order: t.sortOrder,
    blocker: t.blocker ? (typeof t.blocker === 'string' ? JSON.parse(t.blocker) : t.blocker) : null,
    createdAt: t.createdAt,
    completedAt: t.completedAt,
  };
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM tasks WHERE "userId" = $1 ORDER BY "sortOrder" ASC',
    [req.user.userId]
  );
  res.json(rows.map(serializeTask));
});

router.post('/', async (req, res) => {
  const { name, duration, priority, categories, description } = req.body;
  const { rows: maxRows } = await pool.query(
    'SELECT MAX("sortOrder") as m FROM tasks WHERE "userId" = $1',
    [req.user.userId]
  );
  const maxOrder = maxRows[0].m ?? -1;
  const { rows } = await pool.query(
    `INSERT INTO tasks ("userId", name, duration, priority, categories, description, "sortOrder")
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      req.user.userId,
      name,
      duration || 30,
      priority || 'Med',
      JSON.stringify(categories || []),
      description || '',
      maxOrder + 1,
    ]
  );
  res.json(serializeTask(rows[0]));
});

router.patch('/:id', async (req, res) => {
  const { rows: existing } = await pool.query(
    'SELECT * FROM tasks WHERE id = $1 AND "userId" = $2',
    [req.params.id, req.user.userId]
  );
  if (!existing.length) return res.status(404).json({ error: 'Task not found' });

  const colMap = {
    name: 'name', duration: 'duration', priority: 'priority',
    status: 'status', description: 'description',
    completedAt: '"completedAt"', order: '"sortOrder"',
  };

  const sets = [];
  const values = [];
  let i = 1;

  for (const [key, col] of Object.entries(colMap)) {
    if (req.body[key] !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(req.body[key]);
    }
  }
  if (req.body.categories !== undefined) {
    sets.push(`categories = $${i++}`);
    values.push(JSON.stringify(req.body.categories));
  }
  if (req.body.blocker !== undefined) {
    sets.push(`blocker = $${i++}`);
    values.push(req.body.blocker ? JSON.stringify(req.body.blocker) : null);
  }
  if (req.body.status === 'done' && req.body.completedAt === undefined) {
    sets.push(`"completedAt" = $${i++}`);
    values.push(new Date().toISOString());
  }

  if (!sets.length) return res.json(serializeTask(existing[0]));

  values.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  res.json(serializeTask(rows[0]));
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM tasks WHERE id = $1 AND "userId" = $2', [req.params.id, req.user.userId]);
  res.json({ success: true });
});

router.post('/reorder', async (req, res) => {
  const { tasks } = req.body;
  if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks must be an array' });
  await Promise.all(
    tasks.map((t, i) =>
      pool.query('UPDATE tasks SET "sortOrder" = $1 WHERE id = $2 AND "userId" = $3', [i, t.id, req.user.userId])
    )
  );
  res.json({ success: true });
});

export default router;

import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM goals WHERE "userId" = $1 ORDER BY "createdAt" ASC',
    [req.user.userId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { title, target, current, label } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const { rows } = await pool.query(
    'INSERT INTO goals ("userId", title, target, current, label) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.user.userId, title, target || 100, current || 0, label || 'Key Result']
  );
  res.json(rows[0]);
});

router.patch('/:id', async (req, res) => {
  const { rows: existing } = await pool.query(
    'SELECT * FROM goals WHERE id = $1 AND "userId" = $2',
    [req.params.id, req.user.userId]
  );
  if (!existing.length) return res.status(404).json({ error: 'Goal not found' });

  const allowed = ['title', 'target', 'current', 'label'];
  const sets = [];
  const values = [];
  let i = 1;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      values.push(req.body[key]);
    }
  }

  if (!sets.length) return res.json(existing[0]);

  values.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE goals SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM goals WHERE id = $1 AND "userId" = $2', [req.params.id, req.user.userId]);
  res.json({ success: true });
});

export default router;

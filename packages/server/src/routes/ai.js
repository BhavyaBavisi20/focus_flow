import { Router } from 'express';
import Groq from 'groq-sdk';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.1-8b-instant'; // free, fast open-source model

async function generate(prompt, maxTokens = 1024) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.7,
  });
  return completion.choices[0].message.content;
}

router.post('/coach', async (req, res) => {
  try {
    const { tasks = [], goals = [] } = req.body;

    const taskSummary = tasks
      .map(
        (t) =>
          `- "${t.name}" | ${t.priority} priority | ${t.duration}min | Status: ${t.status}${
            t.blocker ? ` | BLOCKED: ${t.blocker.type} - ${t.blocker.description}` : ''
          }`
      )
      .join('\n');

    const goalSummary = goals
      .map((g) => `- "${g.title}" | Progress: ${g.current}/${g.target} | Label: ${g.label}`)
      .join('\n');

    const prompt = `You are an expert productivity coach. Analyze this person's current tasks and monthly goals, then provide 3-5 concise, actionable coaching tips to maximize their productivity today.

CURRENT TASKS:
${taskSummary || 'No tasks yet.'}

MONTHLY GOALS:
${goalSummary || 'No goals set.'}

Provide practical, motivating advice. Focus on:
1. How to tackle blocked tasks
2. Priority sequencing
3. Time management based on task durations
4. Progress toward monthly goals
5. Energy and focus optimization

Keep each tip to 1-2 sentences. Be encouraging but realistic.`;

    const tips = await generate(prompt, 512);
    res.json({ tips });
  } catch (error) {
    console.error('AI coach error:', error?.message || error);
    res.status(500).json({ error: 'Failed to generate coaching tips', message: error.message });
  }
});

router.post('/eod-report', async (req, res) => {
  try {
    const { tasks = [], goals = [] } = req.body;
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const doneTasks = tasks.filter((t) => t.status === 'done');
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    const blockedTasks = tasks.filter((t) => t.status === 'blocked');
    const focusTime = doneTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const focusHours = Math.floor(focusTime / 60);
    const focusMinutes = focusTime % 60;

    const prompt = `Generate a professional End-of-Day (EOD) report in Markdown format for ${today}.

DATA:
Completed Tasks (${doneTasks.length}):
${doneTasks.map((t) => `- ${t.name} (${t.duration}min, ${t.priority} priority)`).join('\n') || 'None'}

Pending Tasks (${pendingTasks.length}):
${pendingTasks.map((t) => `- ${t.name} (${t.duration}min, ${t.priority} priority)`).join('\n') || 'None'}

Blocked Tasks (${blockedTasks.length}):
${blockedTasks.map((t) => `- ${t.name}: ${t.blocker?.type} - ${t.blocker?.description}`).join('\n') || 'None'}

Monthly Goals:
${goals.map((g) => `- ${g.title}: ${g.current}/${g.target} (${g.label})`).join('\n') || 'None set'}

Total Focus Time: ${focusHours}h ${focusMinutes}m

Write a well-structured Markdown EOD report with these sections:
1. Daily Summary
2. Accomplishments
3. Pending Items & Next Steps
4. Blockers & Required Actions
5. Monthly Goal Progress
6. Reflection & Tomorrow's Focus`;

    const report = await generate(prompt, 1024);
    res.json({ report });
  } catch (error) {
    console.error('EOD report error:', error?.message || error);
    res.status(500).json({ error: 'Failed to generate EOD report', message: error.message });
  }
});

export default router;

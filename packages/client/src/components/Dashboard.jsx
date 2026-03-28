import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Flame, ListTodo, RefreshCw, Download } from 'lucide-react';
import api from '../api.js';

const HEATMAP_KEY = 'todo-heatmap';

function getHeatmap() {
  try {
    return JSON.parse(localStorage.getItem(HEATMAP_KEY) || '{}');
  } catch {
    return {};
  }
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function formatFocusTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ percent }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#374151" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-white">{Math.round(percent)}%</span>
        <span className="text-xs text-gray-400">complete</span>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
      <div className={`${color} rounded-lg p-2.5`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

// ─── Weekly Heatmap ───────────────────────────────────────────────────────────

function WeeklyHeatmap() {
  const heatmap = getHeatmap();
  const days = getLast7Days();
  const maxCount = Math.max(...days.map((d) => heatmap[d] || 0), 1);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
        Weekly Activity
      </h3>
      <div className="flex gap-2">
        {days.map((dateStr) => {
          const count = heatmap[dateStr] || 0;
          const intensity = count === 0 ? 0 : Math.ceil((count / maxCount) * 4);
          const colors = [
            'bg-gray-700',
            'bg-indigo-900',
            'bg-indigo-700',
            'bg-indigo-500',
            'bg-indigo-400',
          ];
          const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
          const isToday = dateStr === new Date().toISOString().slice(0, 10);

          return (
            <div key={dateStr} className="flex flex-col items-center gap-1 flex-1">
              <div
                title={`${dateStr}: ${count} completed`}
                className={`w-full aspect-square rounded-md ${colors[intensity]} transition-colors ${
                  isToday ? 'ring-2 ring-indigo-400' : ''
                }`}
              />
              <span className="text-xs text-gray-500">{dayLabels[dayOfWeek]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI Coach Card ────────────────────────────────────────────────────────────

function AICoachCard({ tasks, goals }) {
  const [tips, setTips] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTips = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/ai/coach', { tasks, goals });
      setTips(res.data.tips);
    } catch (e) {
      setError('Failed to fetch coaching tips. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          AI Productivity Coach
        </h3>
        <button
          onClick={fetchTips}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Thinking…' : 'Get Tips'}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {tips ? (
        <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{tips}</div>
      ) : (
        !loading && (
          <p className="text-gray-500 text-sm italic">
            Click "Get Tips" to receive personalized AI coaching based on your current tasks and goals.
          </p>
        )
      )}

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Analyzing your tasks…
        </div>
      )}
    </div>
  );
}

// ─── EOD Report ───────────────────────────────────────────────────────────────

function EODReportButton({ tasks, goals }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/ai/eod-report', { tasks, goals });
      const blob = new Blob([res.data.report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EOD-Report-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to generate EOD report. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition-colors text-sm font-medium w-full justify-center"
    >
      <Download size={16} className={loading ? 'animate-bounce' : ''} />
      {loading ? 'Generating…' : 'Download EOD Report'}
    </button>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({ tasks, goals, streak }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'done').length;
  const focusTime = tasks
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.duration || 0), 0);
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={ListTodo} label="Total Tasks" value={total} color="bg-indigo-600" />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} color="bg-green-600" />
        <StatCard
          icon={Clock}
          label="Focus Time"
          value={formatFocusTime(focusTime)}
          color="bg-blue-600"
        />
        <StatCard icon={Flame} label="Day Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} color="bg-orange-600" />
      </div>

      {/* Progress Ring */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 flex flex-col items-center">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
          Completion Rate
        </h3>
        <div className="relative">
          <ProgressRing percent={percent} />
        </div>
        <p className="text-gray-400 text-sm mt-2">
          {completed} of {total} tasks done
        </p>
      </div>

      {/* Weekly Heatmap */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <WeeklyHeatmap />
      </div>

      {/* AI Coach */}
      <AICoachCard tasks={tasks} goals={goals} />

      {/* EOD Report */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
          End of Day Report
        </h3>
        <EODReportButton tasks={tasks} goals={goals} />
      </div>
    </div>
  );
}

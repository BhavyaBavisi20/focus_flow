import React, { useState } from 'react';
import { Plus, Target, Trash2, Pencil, Check, X } from 'lucide-react';

const LABELS = [
  'Must Achieve',
  'Stretch Goal',
  'Key Result',
  'Milestone',
  'Side Quest',
  'Personal Growth',
];

function GoalCard({ goal, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(goal.current);
  const [saving, setSaving] = useState(false);

  const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;

  const labelColors = {
    'Must Achieve': 'bg-red-900/40 text-red-400 border-red-800/40',
    'Stretch Goal': 'bg-purple-900/40 text-purple-400 border-purple-800/40',
    'Key Result': 'bg-blue-900/40 text-blue-400 border-blue-800/40',
    Milestone: 'bg-yellow-900/40 text-yellow-400 border-yellow-800/40',
    'Side Quest': 'bg-green-900/40 text-green-400 border-green-800/40',
    'Personal Growth': 'bg-pink-900/40 text-pink-400 border-pink-800/40',
  };

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(goal.id, { current: Number(current) });
    setSaving(false);
    setEditing(false);
  };

  const progressColor =
    percent >= 100 ? 'bg-green-500' : percent >= 50 ? 'bg-indigo-500' : 'bg-yellow-500';

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white text-sm leading-snug mb-1">{goal.title}</h3>
          {goal.label && (
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${
                labelColors[goal.label] || 'bg-gray-700 text-gray-400 border-gray-600'
              }`}
            >
              {goal.label}
            </span>
          )}
        </div>
        <button
          onClick={() => onDelete(goal.id)}
          className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0 ml-2"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">Progress</span>
          <span className="text-xs font-medium text-white">
            {goal.current} / {goal.target}
            <span className="text-gray-400 ml-1">({percent}%)</span>
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${progressColor} transition-all duration-500`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Update progress */}
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            min="0"
            max={goal.target}
            className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => { setEditing(false); setCurrent(goal.current); }}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Pencil size={12} />
          Update Progress
        </button>
      )}
    </div>
  );
}

function AddGoalModal({ onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [label, setLabel] = useState('Key Result');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Goal title is required.'); return; }
    if (!target || isNaN(Number(target)) || Number(target) <= 0) {
      setError('Please enter a valid target number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAdd({
        title: title.trim(),
        target: Number(target),
        current: Number(current) || 0,
        label,
      });
      onClose();
    } catch {
      setError('Failed to add goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Add Monthly Goal</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-900/40 border border-red-500 text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Goal Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete 20 coding challenges"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Target *</label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="20"
                min="1"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Current</label>
              <input
                type="number"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Label</label>
            <select
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {LABELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {loading ? 'Adding…' : 'Add Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MonthlyGoals({ goals, onAdd, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);

  const totalProgress = goals.reduce(
    (acc, g) => {
      acc.current += g.current || 0;
      acc.target += g.target || 0;
      return acc;
    },
    { current: 0, target: 0 }
  );

  const overallPercent =
    totalProgress.target > 0
      ? Math.min(100, Math.round((totalProgress.current / totalProgress.target) * 100))
      : 0;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-indigo-400" />
          <h1 className="text-lg font-bold text-white">Monthly Goals</h1>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
            {goals.length}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Goal
        </button>
      </div>

      {/* Overall progress */}
      {goals.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Overall Progress</span>
            <span className="text-sm font-bold text-white">{overallPercent}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {totalProgress.current} of {totalProgress.target} total units completed
          </p>
        </div>
      )}

      {/* Goal cards */}
      {goals.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No goals yet. Set your first monthly goal!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddGoalModal onClose={() => setShowAdd(false)} onAdd={onAdd} />
      )}
    </div>
  );
}

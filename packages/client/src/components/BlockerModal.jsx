import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const BLOCKER_TYPES = [
  { value: 'dependency', label: 'Dependency' },
  { value: 'technical', label: 'Technical' },
  { value: 'clarity', label: 'Clarity' },
];

export default function BlockerModal({ task, onClose, onSave }) {
  const [type, setType] = useState(task?.blocker?.type || 'dependency');
  const [description, setDescription] = useState(task?.blocker?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please describe the blocker.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSave({ type, description: description.trim() });
      onClose();
    } catch {
      setError('Failed to save blocker. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-400" />
            <h2 className="text-lg font-semibold text-white">Mark as Blocked</h2>
          </div>
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

          <div className="bg-orange-900/20 border border-orange-800/40 rounded-xl p-3">
            <p className="text-sm text-gray-300">
              Task: <span className="font-medium text-white">{task?.name}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Blocker Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {BLOCKER_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what is blocking this task..."
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500 resize-none"
            />
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
              className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {loading ? 'Saving…' : 'Mark Blocked'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

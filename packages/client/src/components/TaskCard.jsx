import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Clock,
  Tag,
  RotateCcw,
} from 'lucide-react';

const priorityConfig = {
  High: { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-800/60', dot: 'bg-red-400' },
  Med: { bg: 'bg-yellow-900/40', text: 'text-yellow-400', border: 'border-yellow-800/60', dot: 'bg-yellow-400' },
  Low: { bg: 'bg-green-900/40', text: 'text-green-400', border: 'border-green-800/60', dot: 'bg-green-400' },
};

const statusConfig = {
  done: { bg: 'bg-green-900/20', border: 'border-green-800/40', label: 'bg-green-900/40 text-green-400' },
  blocked: { bg: 'bg-red-900/20', border: 'border-red-800/40', label: 'bg-red-900/40 text-red-400' },
  pending: { bg: 'bg-gray-800', border: 'border-gray-700', label: 'bg-blue-900/40 text-blue-400' },
};

const blockerTypeLabels = {
  dependency: 'Dependency',
  technical: 'Technical',
  clarity: 'Clarity',
};

export default function TaskCard({ task, onMarkDone, onMarkBlocked, onDelete, onRestore }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const pri = priorityConfig[task.priority] || priorityConfig.Med;
  const stat = statusConfig[task.status] || statusConfig.pending;

  const formatDuration = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border ${stat.bg} ${stat.border} overflow-hidden shadow-sm`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0"
          >
            <GripVertical size={18} />
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-medium text-sm leading-snug ${
                  task.status === 'done' ? 'line-through text-gray-500' : 'text-white'
                }`}
              >
                {task.name}
              </h3>

              {/* Status badge */}
              <span
                className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${stat.label}`}
              >
                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Priority */}
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${pri.bg} ${pri.text} ${pri.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
                {task.priority === 'Med' ? 'Medium' : task.priority}
              </span>

              {/* Duration */}
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} />
                {formatDuration(task.duration)}
              </span>

              {/* Categories */}
              {task.categories && task.categories.length > 0 &&
                task.categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-900/30 border border-indigo-800/40 px-2 py-0.5 rounded-full"
                  >
                    <Tag size={10} />
                    {cat}
                  </span>
                ))}
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{task.description}</p>
            )}
          </div>
        </div>

        {/* Blocker banner */}
        {task.status === 'blocked' && task.blocker && (
          <div className="mt-3 bg-red-900/30 border border-red-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={13} className="text-orange-400" />
              <span className="text-xs font-medium text-orange-400">
                {blockerTypeLabels[task.blocker.type] || task.blocker.type} Blocker
              </span>
            </div>
            <p className="text-xs text-red-300">{task.blocker.description}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/50">
          {task.status !== 'done' && (
            <button
              onClick={() => onMarkDone(task.id)}
              className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 hover:bg-green-900/30 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <CheckCircle2 size={13} />
              Done
            </button>
          )}

          {task.status === 'done' && (
            <button
              onClick={() => onRestore(task.id)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw size={13} />
              Restore
            </button>
          )}

          {task.status !== 'blocked' && task.status !== 'done' && (
            <button
              onClick={() => onMarkBlocked(task)}
              className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-900/30 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <AlertTriangle size={13} />
              Blocked
            </button>
          )}

          {task.status === 'blocked' && (
            <button
              onClick={() => onRestore(task.id)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw size={13} />
              Unblock
            </button>
          )}

          <div className="flex-1" />

          <button
            onClick={() => onDelete(task.id)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

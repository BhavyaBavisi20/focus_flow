import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus, CheckSquare } from 'lucide-react';
import TaskCard from './TaskCard.jsx';
import AddTaskModal from './AddTaskModal.jsx';
import BlockerModal from './BlockerModal.jsx';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'done', label: 'Done' },
  { id: 'blocked', label: 'Blocked' },
];

export default function TaskList({
  tasks,
  onAdd,
  onUpdate,
  onDelete,
  onMarkDone,
  onMarkBlocked,
  onReorder,
}) {
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [blockerTarget, setBlockerTarget] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filtered =
    filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex);
    onReorder(reordered);
  };

  const handleRestore = (id) => {
    onUpdate(id, { status: 'pending', blocker: null, completedAt: null });
  };

  const tabCount = (id) => {
    if (id === 'all') return tasks.length;
    return tasks.filter((t) => t.status === id).length;
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare size={20} className="text-indigo-400" />
          <h1 className="text-lg font-bold text-white">Tasks</h1>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 bg-gray-800 p-1 rounded-xl border border-gray-700">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              filter === id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {label}
            <span
              className={`ml-1.5 text-xs ${
                filter === id ? 'text-indigo-200' : 'text-gray-500'
              }`}
            >
              {tabCount(id)}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <CheckSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {filter === 'all'
              ? 'No tasks yet. Add your first task!'
              : `No ${filter} tasks.`}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filter === 'all' ? tasks.map((t) => t.id) : filtered.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {filtered.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onMarkDone={onMarkDone}
                  onMarkBlocked={(t) => setBlockerTarget(t)}
                  onDelete={onDelete}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Task Modal */}
      {showAdd && (
        <AddTaskModal onClose={() => setShowAdd(false)} onAdd={onAdd} />
      )}

      {/* Blocker Modal */}
      {blockerTarget && (
        <BlockerModal
          task={blockerTarget}
          onClose={() => setBlockerTarget(null)}
          onSave={(blocker) => onMarkBlocked(blockerTarget.id, blocker)}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import api from './api.js';
import { LayoutDashboard, CheckSquare, Target, Bell, LogOut, Zap, User } from 'lucide-react';
import Dashboard from './components/Dashboard.jsx';
import TaskList from './components/TaskList.jsx';
import MonthlyGoals from './components/MonthlyGoals.jsx';
import AlertSetup from './components/AlertSetup.jsx';

// ─── helpers ────────────────────────────────────────────────────────────────

const HEATMAP_KEY = 'todo-heatmap';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getHeatmap() {
  try {
    return JSON.parse(localStorage.getItem(HEATMAP_KEY) || '{}');
  } catch {
    return {};
  }
}

function bumpHeatmap() {
  const map = getHeatmap();
  const d = todayStr();
  map[d] = (map[d] || 0) + 1;
  localStorage.setItem(HEATMAP_KEY, JSON.stringify(map));
}

function calcStreak() {
  const map = getHeatmap();
  let streak = 0;
  const cur = new Date();
  while (true) {
    const d = cur.toISOString().slice(0, 10);
    if (map[d] && map[d] > 0) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getInitials(name) {
  return name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';
}

function loadStoredAuth() {
  try {
    const token = localStorage.getItem('focusflow_token');
    const user = JSON.parse(localStorage.getItem('focusflow_user') || 'null');
    if (!token || !user) return null;
    // Basic expiry check by decoding JWT payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('focusflow_token');
      localStorage.removeItem('focusflow_user');
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

// ─── Login / Register Screen ─────────────────────────────────────────────────

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email, password } : { email, password, displayName };
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('focusflow_token', data.token);
      localStorage.setItem('focusflow_user', JSON.stringify(data.user));
      onAuth(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-10 w-full max-w-md shadow-2xl border border-gray-700 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 rounded-2xl p-4 mb-4 shadow-lg">
            <Zap size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">FocusFlow</h1>
          <p className="text-gray-400 text-center text-sm">
            Your AI-powered productivity companion. Track tasks, crush goals, and stay in the zone.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500 text-red-300 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-xl px-4 py-3 border border-gray-600 focus:outline-none focus:border-indigo-500"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-xl px-4 py-3 border border-gray-600 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-xl px-4 py-3 border border-gray-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-md"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-5">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                onClick={() => { setMode('register'); setError(''); }}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(''); }}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAlert, setShowAlert] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);

  // Restore session on mount
  useEffect(() => {
    const stored = loadStoredAuth();
    setUser(stored);
    setAuthLoading(false);
  }, []);

  // Fetch tasks & goals when user changes
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data } = await api.get('/tasks');
    setTasks(data);
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await api.get('/goals');
    setGoals(data);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchGoals();
    } else {
      setTasks([]);
      setGoals([]);
    }
  }, [user, fetchTasks, fetchGoals]);

  const handleAuth = (userData) => {
    setUser(userData);
  };

  const handleSignOut = () => {
    localStorage.removeItem('focusflow_token');
    localStorage.removeItem('focusflow_user');
    setUser(null);
    setActiveTab('dashboard');
  };

  // ── Task CRUD ──────────────────────────────────────────────────────────────

  const addTask = async (data) => {
    await api.post('/tasks', data);
    await fetchTasks();
  };

  const updateTask = async (id, data) => {
    await api.patch(`/tasks/${id}`, data);
    await fetchTasks();
  };

  const deleteTask = async (id) => {
    await api.delete(`/tasks/${id}`);
    await fetchTasks();
  };

  const markDone = async (id) => {
    await api.patch(`/tasks/${id}`, { status: 'done' });
    bumpHeatmap();
    await fetchTasks();
  };

  const markBlocked = async (id, blocker) => {
    await api.patch(`/tasks/${id}`, { status: 'blocked', blocker });
    await fetchTasks();
  };

  const reorderTasks = async (newTasks) => {
    setTasks(newTasks);
    await api.post('/tasks/reorder', { tasks: newTasks });
  };

  // ── Goal CRUD ─────────────────────────────────────────────────────────────

  const addGoal = async (data) => {
    await api.post('/goals', data);
    await fetchGoals();
  };

  const updateGoal = async (id, data) => {
    await api.patch(`/goals/${id}`, data);
    await fetchGoals();
  };

  const deleteGoal = async (id) => {
    await api.delete(`/goals/${id}`);
    await fetchGoals();
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const streak = calcStreak();

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading FocusFlow…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'goals', icon: Target, label: 'Goals' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 rounded-lg p-1.5">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg">FocusFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAlert(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <Bell size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {getInitials(user.displayName)}
            </div>
            <span className="text-sm text-gray-300 hidden sm:block">{user.displayName}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'dashboard' && (
          <Dashboard tasks={tasks} goals={goals} streak={streak} user={user} />
        )}
        {activeTab === 'tasks' && (
          <TaskList
            tasks={tasks}
            onAdd={addTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onMarkDone={markDone}
            onMarkBlocked={markBlocked}
            onReorder={reorderTasks}
          />
        )}
        {activeTab === 'goals' && (
          <MonthlyGoals goals={goals} onAdd={addGoal} onUpdate={updateGoal} onDelete={deleteGoal} />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex z-40">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              activeTab === id
                ? 'text-indigo-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon size={20} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>

      {/* Alert modal */}
      {showAlert && <AlertSetup user={user} onClose={() => setShowAlert(false)} />}
    </div>
  );
}

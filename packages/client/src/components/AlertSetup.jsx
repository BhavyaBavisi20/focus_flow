import React, { useState, useEffect } from 'react';
import { X, Bell, Mail, Clock, Send, Calendar, CheckCircle2 } from 'lucide-react';
import api from '../api.js';

export default function AlertSetup({ user, onClose }) {
  const [email, setEmail] = useState('');
  const [schedule, setSchedule] = useState({ morning: false, midday: false, eod: false });
  const [gcalConnected, setGcalConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Load saved config
    api.get('/notifications/config').then(({ data }) => {
      setEmail(data.email || '');
      setSchedule(data.schedule || { morning: false, midday: false, eod: false });
    }).catch(() => {});

    // Check Google Calendar status
    api.get('/notifications/google/status').then(({ data }) => {
      setGcalConnected(data.connected);
    }).catch(() => {});

    // Handle redirect back from Google OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('gcal') === 'connected') {
      setGcalConnected(true);
      setSuccess('Google Calendar connected!');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const toggleSchedule = (key) =>
    setSchedule((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post('/notifications/setup', { email, schedule });
      setSuccess(
        data.calendarSynced
          ? 'Saved! Calendar events updated in Google Calendar.'
          : 'Preferences saved!'
      );
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save preferences.');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/notifications/setup', { email, schedule });
      await api.post('/notifications/send-test');
      setSuccess('Test email sent! Check your inbox.');
    } catch (e) {
      const detail = e.response?.data?.details?.join(' | ') || e.response?.data?.error || 'Failed to send.';
      setError(detail);
    } finally {
      setTesting(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { data } = await api.get('/notifications/google/connect');
      window.location.href = data.url;
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to start Google auth.');
    }
  };

  const scheduleOptions = [
    { key: 'morning', label: 'Morning',    time: '8:00 AM',  icon: '🌅' },
    { key: 'midday',  label: 'Midday',     time: '12:00 PM', icon: '☀️' },
    { key: 'eod',     label: 'End of Day', time: '6:00 PM',  icon: '🌆' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Alert Setup</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {success && (
            <div className="bg-green-900/40 border border-green-500 text-green-300 rounded-xl p-3 text-sm text-center">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-900/40 border border-red-500 text-red-300 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
              <Mail size={14} className="text-gray-400" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
            />
          </div>

          {/* Google Calendar */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
              <Calendar size={14} className="text-gray-400" />
              Google Calendar
            </label>
            {gcalConnected ? (
              <div className="flex items-center gap-2 bg-green-900/30 border border-green-600 text-green-300 rounded-xl px-4 py-2.5 text-sm">
                <CheckCircle2 size={16} />
                Connected — check-in events will sync to your calendar
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors border border-gray-600"
              >
                <svg width="16" height="16" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.1 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.9 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 16.3 5 9.6 9 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 45c4.9 0 9.3-1.9 12.7-4.9l-5.9-5c-1.8 1.3-4.1 2-6.8 2-5.2 0-9.7-3.5-11.3-8.2L6.1 34c3.2 5.8 9.7 11 17.9 11z"/>
                  <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l5.9 5C41 35.8 44 31 44 25c0-1.3-.1-2.7-.4-3.9z"/>
                </svg>
                Connect Google Calendar
              </button>
            )}
          </div>

          {/* Schedule */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
              <Clock size={14} className="text-gray-400" />
              Check-in Schedule
              {gcalConnected && (
                <span className="text-xs text-green-400 font-normal">· creates calendar events</span>
              )}
            </label>
            <div className="space-y-2">
              {scheduleOptions.map(({ key, label, time, icon }) => (
                <button
                  key={key}
                  onClick={() => toggleSchedule(key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    schedule[key]
                      ? 'bg-indigo-900/40 border-indigo-600 text-white'
                      : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{icon}</span>
                    <div className="text-left">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-gray-500">{time}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    schedule[key] ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'
                  }`}>
                    {schedule[key] && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={loading || testing}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={handleTest}
              disabled={loading || testing || !email}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Send size={14} className={testing ? 'animate-pulse' : ''} />
              {testing ? 'Sending…' : 'Send Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

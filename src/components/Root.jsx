import React, { useState } from 'react';
import { getApiKey, setApiKey } from '../api.js';
import { LoginScreen } from './LoginScreen.jsx';
import { App } from './App.jsx';

export function Root() {
  const [authed, setAuthed] = useState(!!getApiKey());
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <App onLogout={() => { setApiKey(""); setAuthed(false); }} />;
}

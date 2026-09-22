'use client';
import { useRef, useState } from 'react';
import { INSTALL_PROMPT } from '@/lib/hackathon';
import s from './hackathon.module.css';

export default function CopyPrompt() {
  const [message, setMessage] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  async function copy() {
    try { await navigator.clipboard.writeText(INSTALL_PROMPT); setMessage('Copied. Paste it into your coding agent.'); }
    catch { input.current?.focus(); input.current?.select(); setMessage('Select and copy the prompt below.'); }
  }
  return <div className={s.prompt}>
    <div className={s.promptTop}><span>01 / INSTALL → INTERVIEW → BUILD</span><button onClick={copy}>Copy agent prompt ↗</button></div>
    <label className={s.srOnly} htmlFor="agent-prompt">Installation and hackathon kickoff prompt</label>
    <textarea id="agent-prompt" ref={input} readOnly value={INSTALL_PROMPT} spellCheck={false} />
    <p role="status" aria-live="polite">{message || 'Works with agents that support skills, including Codex and Claude Code.'}</p>
  </div>;
}

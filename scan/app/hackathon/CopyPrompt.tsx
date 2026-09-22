'use client';
import { useRef, useState } from 'react';
import { INSTALL_PROMPT } from '@/lib/game-builder-prompts';
import s from './hackathon.module.css';

export default function CopyPrompt({prompt = INSTALL_PROMPT, id = 'agent-prompt', label = 'Installation and hackathon kickoff prompt', title = '01 / INSTALL → INTERVIEW → BUILD', buttonLabel = 'Copy agent prompt'}: {prompt?: string; id?: string; label?: string; title?: string; buttonLabel?: string}) {
  const [message, setMessage] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setMessage('Copied. Paste it into your coding agent.'); }
    catch { input.current?.focus(); input.current?.select(); setMessage('Select and copy the prompt below.'); }
  }
  return <div className={s.prompt}>
    <div className={s.promptTop}><span>{title}</span><button onClick={copy}>{buttonLabel} ↗</button></div>
    <label className={s.srOnly} htmlFor={id}>{label}</label>
    <textarea id={id} ref={input} readOnly value={prompt} spellCheck={false} />
    <p role="status" aria-live="polite">{message || 'Works with agents that support skills, including Codex and Claude Code.'}</p>
  </div>;
}

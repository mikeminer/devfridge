'use client';

import { Component, useCallback, useId, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import styles from './skill-box.module.css';

const SkillDvdScene = dynamic(() => import('./SkillDvdScene'), { ssr: false });

class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function SkillBoxShowcase() {
  const titleId = useId();
  const statusId = useId();
  const [model, setModel] = useState({ isOpen: false, discOut: false, rotation: 0 });
  const [sceneState, setSceneState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const onReady = useCallback(() => setSceneState(previous => previous === 'unavailable' ? previous : 'ready'), []);
  const onError = useCallback(() => setSceneState('unavailable'), []);
  const ready = sceneState === 'ready';
  const degrees = Math.round(model.rotation * 180 / Math.PI) % 360;
  const stateText = sceneState === 'loading'
    ? 'Preparing your 3D edition…'
    : sceneState === 'unavailable'
      ? 'Cover preview. 3D is unavailable here; you can still install the skill.'
      : `${model.isOpen ? 'Case open' : 'Case closed'} · ${model.discOut ? 'Disc ejected' : 'Disc inside'} · View ${degrees}°`;

  return (
    <section className={styles.showcase} aria-labelledby={titleId}>
      <div className={styles.header}>
        <div>
          <p className={styles.edition}><span aria-hidden="true" /> THE BUILDER’S EDITION</p>
          <h2 className={styles.title} id={titleId}>A little box. A world of possibility.</h2>
        </div>
        <span className={styles.release}>VOL. 001<br /><strong>v1.7.5</strong></span>
      </div>

      <div className={styles.stage}>
        <div className={styles.cornerTop} aria-hidden="true"><span>DEVFRIDGE / SOFTWARE</span><span>01 — 03</span></div>
        <div className={styles.scene} aria-hidden="true">
          {sceneState !== 'unavailable' && (
            <SceneBoundary onError={onError}>
              <SkillDvdScene {...model} onReady={onReady} onError={onError} />
            </SceneBoundary>
          )}
        </div>
        <div className={`${styles.poster} ${ready ? styles.posterHidden : ''}`} aria-hidden={ready}>
          <div className={styles.posterCover}>
            <div className={styles.coverBrand}>DEVFRIDGE<span>WORLD / BUILD</span></div>
            <div className={styles.coverTitle}>Game<br />Builder<span>YOUR MEME.<br />A WORLD TO PLAY.</span></div>
            <div className={styles.coverFooter}><span>AGENT SKILL<br />BROWSER + SEEKER</span><strong>1.7.5</strong></div>
          </div>
        </div>
        <div className={styles.cornerBottom} aria-hidden="true"><span>CASE / COVER / DISC</span><span>OPEN. EXPLORE. BUILD.</span></div>
      </div>

      <div className={styles.panel}>
        <div className={styles.controls} role="group" aria-label="Explore the game builder edition" aria-describedby={statusId}>
          <button type="button" disabled={!ready} aria-pressed={model.isOpen} onClick={() => setModel(previous => ({ ...previous, isOpen: !previous.isOpen, discOut: false }))}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4 3 2.5v13L10 17l7-1.5v-13L10 4Zm0 0v13" /></svg>
            {model.isOpen ? 'Close case' : 'Open case'}
          </button>
          <button type="button" disabled={!ready} aria-pressed={model.discOut} onClick={() => setModel(previous => ({ ...previous, isOpen: true, discOut: !previous.discOut }))}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.2" /><circle cx="10" cy="10" r="2" /><path d="m12.5 4.5 2 2M5.5 12.5l2 2" /></svg>
            {model.discOut ? 'Return disc' : 'Eject disc'}
          </button>
          <button type="button" disabled={!ready} onClick={() => setModel(previous => ({ ...previous, rotation: previous.rotation + Math.PI / 2 }))}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.5 8a6.8 6.8 0 1 0 .1 4M16.5 3v5h-5" /></svg>
            Rotate <span className={styles.rotationUnit}>90°</span>
          </button>
          <button type="button" disabled={!ready} onClick={() => setModel({ isOpen: false, discOut: false, rotation: 0 })}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 8a6.8 6.8 0 1 1-.1 4M3.5 3v5h5" /></svg>
            Reset
          </button>
        </div>
        <div className={styles.statusRow}>
          <p id={statusId} className={styles.status} role="status" aria-live="polite" aria-atomic="true"><span className={ready ? styles.readyLight : styles.idleLight} aria-hidden="true" />{stateText}</p>
          <span className={styles.format} aria-hidden="true">THREE.JS</span>
        </div>
      </div>
    </section>
  );
}

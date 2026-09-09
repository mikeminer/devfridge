"use client";

import { useEffect, useRef, useState } from "react";
import characters from "@/lib/brainrot-solana.json";
import { characterShare, WORLD_BANNER } from "@/lib/world-share";
import styles from "./runway.module.css";

export default function RunwayShare({ id, onPick }: { id: string; onPick: (id: string) => void }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState(false);
  const [banner, setBanner] = useState<File | null>(null);
  const [bannerError, setBannerError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [sharing, setSharing] = useState(false);
  const postField = useRef<HTMLTextAreaElement>(null);
  const previewPanel = useRef<HTMLDivElement>(null);
  const share = characterShare(chosen ?? id);
  const pick = (next: string) => { setChosen(next); setStatus(""); onPick(next); };
  useEffect(() => {
    if (!preview || banner) return;
    const controller = new AbortController();
    setBannerError(false);
    void fetch("/world/brainrot-pose-banner-v1.png", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Banner unavailable");
        const blob = await response.blob();
        if (!blob.size || blob.type !== "image/png") throw new Error("Invalid banner");
        if (!controller.signal.aborted) setBanner(new File([blob], "devfridge-world-cast.png", { type: "image/png" }));
      })
      .catch(() => { if (!controller.signal.aborted) setBannerError(true); });
    return () => controller.abort();
  }, [preview, banner, retry]);
  const openPost = () => {
    pick(share.id); setPreview(true);
    requestAnimationFrame(() => {
      previewPanel.current?.focus({ preventScroll: true });
      previewPanel.current?.scrollIntoView({ block: "nearest" });
    });
  };
  const shareBanner = async () => {
    if (!banner || sharing) return;
    try {
      if (!navigator.share || !navigator.canShare?.({ files: [banner] })) {
        setStatus("Photo sharing is unavailable here. Copy or save the banner, open X with the caption, then paste or attach the image.");
        return;
      }
      setSharing(true);
      // The file is prepared before this click to preserve mobile user activation.
      await navigator.share({ files: [banner], text: share.post, title: "My DevFridge World pick" });
      setStatus("Banner and caption handed to your chosen app. Check both before posting; use Copy post if the app omitted the caption.");
    } catch (error) {
      setStatus((error as DOMException).name === "AbortError"
        ? "Sharing cancelled. Your banner and post are still ready."
        : "Photo sharing could not open. Copy or save the banner, then attach it in X with the caption below.");
    } finally { setSharing(false); }
  };
  const copyBanner = async () => {
    if (!banner) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": banner })]);
      setStatus("Banner copied. Open X with the caption, then paste the image into the composer before posting.");
    } catch { setStatus("Image copying is unavailable. Save the banner below and attach it in X."); }
  };
  const copy = async (post: boolean) => {
    try { await navigator.clipboard.writeText(post ? share.post : share.url); setStatus(post ? "Post copied. Make it yours on X." : "Invite copied. Your link opens the runway on your character."); }
    catch { setPreview(true); setStatus("Copy unavailable. Select the post below and copy it manually."); requestAnimationFrame(() => { postField.current?.focus(); postField.current?.select(); }); }
  };
  return <section id="pick-your-brainrot" className={styles.sharing} aria-labelledby="pick-heading">
    <p className={styles.eyebrow}>YOUR PICK. YOUR BRAGGING RIGHTS.</p>
    <h3 id="pick-heading" className={styles.pickHeading}>Who are you bringing to the fridge?</h3>
    <p className={styles.track}>Pick a brainrot. Post your choice. Let your friends pick a rival.</p>
    <div className={styles.pickGrid} aria-label="Choose your brainrot">
      {Object.entries(characters).map(([key, character]) => <button key={key} type="button" aria-pressed={share.id === key} onClick={() => pick(key)}>
        <img src={`/world/memes/${key}.webp`} width={64} height={64} loading="lazy" alt="" />
        <span>{character.name}</span>
      </button>)}
    </div>
    <p className={styles.pickLabel}>Your pick: <strong>{share.name}</strong></p>
    <div className={styles.shareButtons}>
      <button className={styles.xPrimary} type="button" onClick={openPost}>Post my pick on X ↗</button>
      <button type="button" onClick={() => void copy(false)}>Copy invite</button>
      <a href={`https://t.me/share/url?${new URLSearchParams({ url: share.url, text: share.text })}`} target="_blank" rel="noopener noreferrer">Telegram</a>
      <a href={`https://wa.me/?${new URLSearchParams({ text: share.post })}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
    </div>
    <details className={styles.shareDetails} open={preview} onToggle={event => { const opened = event.currentTarget.open; setPreview(opened); if (opened && !chosen) pick(share.id); }}>
      <summary>Preview your post &amp; banner</summary>
      <div ref={previewPanel} className={styles.sharePreview} tabIndex={-1} aria-label="Share your banner and post">
        <p><strong>Post your pick with the cast banner.</strong> On mobile, tap Share banner + post and choose X. Check the image and caption before publishing.</p>
        <img className={styles.postBanner} src={WORLD_BANNER} width={1729} height={910} loading="lazy" alt="Ten DevFridge brainrots posing together in front of the fridge" />
        <div className={styles.shareButtons}>
          <button className={styles.xPrimary} type="button" disabled={!banner || sharing} onClick={() => void shareBanner()}>{sharing ? "Sharing…" : banner ? "Share banner + post" : bannerError ? "Banner unavailable" : "Preparing banner…"}</button>
          {bannerError && <button type="button" onClick={() => setRetry(value => value + 1)}>Retry banner</button>}
        </div>
        <p>Using X in a browser? Copy or save the banner, open X with the caption, then paste or attach the image.</p>
        <textarea ref={postField} aria-label="Your X post" readOnly value={share.post} onFocus={event => event.currentTarget.select()} rows={5} />
        <div className={styles.shareButtons}>
          <button type="button" disabled={!banner} onClick={() => void copyBanner()}>Copy banner image</button>
          <button type="button" onClick={() => void copy(true)}>Copy post</button>
          <a href="/world/brainrot-pose-banner-v1.png" download="devfridge-world-cast.png">Save cast banner ↓</a>
          <a href={share.x} target="_blank" rel="noopener noreferrer">Open X with caption ↗</a>
        </div>
        <p>You can edit the caption on X before posting. Choosing here is for sharing; game access still requires a qualifying timelock.</p>
      </div>
    </details>
    {status && <p className={styles.status} role="status">{status}</p>}
  </section>;
}

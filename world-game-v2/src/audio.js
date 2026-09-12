import { assetUrl, enqueue } from "./assets.js";

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.buffers = new Map();
  }
  prepare() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(this.ctx.destination);
  }
  async unlock() {
    this.prepare();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }
  async load(url) {
    if (this.buffers.has(url)) return this.buffers.get(url);
    const buf = await enqueue(async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(url);
      this.prepare();
      return this.ctx.decodeAudioData(await res.arrayBuffer());
    });
    this.buffers.set(url, buf);
    return buf;
  }
  async play(url, { loop = false } = {}) {
    if (this.muted) return;
    try {
      await this.unlock();
      const buffer = await this.load(url);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = loop;
      src.connect(this.master);
      src.start();
      return src;
    } catch {
      /* audio is optional */
    }
  }
  async playMember(member, kind) {
    const path = member[kind] || member.sfx;
    if (!path) return;
    return this.play(assetUrl(path));
  }
}

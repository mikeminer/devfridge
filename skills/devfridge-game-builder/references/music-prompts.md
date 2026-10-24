# Music briefs and adaptive soundtrack

Use [the blank and filled music brief](../assets/templates/music-brief.md). The owner supplies music or authorises a particular external provider and any generation cost; possible tools include Gemini Lyria, ElevenLabs Music, Suno and Udio. Verify that provider's current licence and commercial-use terms for the actual account before using output. Record source, author/tool, date and licence in [ASSETS_LICENSES](../assets/templates/ASSETS_LICENSES.md). Provider names are examples, not claims of integrations included in this skill.

## Brief requirements

Name the game, genre, setting, 3–5 mood words and instrumentation/reference era. Do not request a living artist imitation, copyrighted melody or intelligible vocal words. Specify unwanted sudden silence and elements that would mask dialogue/SFX. A horror-street example is supplied separately; other games choose their own tone.

For every cue define BPM, key/mode, time signature, length, bar-aligned start/end markers and desired loop bars (for example 32 or 64). Reconcile duration with tempo: 32 bars of 4/4 at 120 BPM = 64 seconds; 64 bars at 96 BPM = 160 seconds. Loopable cues have no generator fade-in or fade-out. Delivery target: stereo PCM originals at 48 kHz, −14 to −16 integrated LUFS and ≤−1 dB true peak. Measure rendered output; a prompt alone does not establish audio compliance.

Request:

1. Menu loop, normally 60–75 seconds; welcoming and suited to the game's mood. It autostarts where platform policy permits.
2. Gameplay loop, 120–180 seconds with steady energy and room in the 1–4 kHz band for voices/SFX.
3. Aligned stems with identical BPM, key, start, sample length and loop bars: base/pads/bass, rhythm/percussion, tension/strings or synth stabs, danger/choir or brass hits. Request stems explicitly; do not promise they can be extracted cleanly from a stereo mix.
4. Same-key 1–4 second stingers: level start, near miss, success, failure, pass activated and new record.
5. Nonlooping victory and defeat cues, 5–10 seconds, ending on the tonic.
6. Optional ambience without melody; separate from music so the owner can mute one without losing the other.

## Runtime and transport

Route to the vendored `audio-design` through [gamedev skills](gamedev-skills.md). Separate music, SFX and UI buses. Duck music by 4–6 dB beneath character screams and stingers, with controlled attack/release. Crossfade intensity layers as game states change; align all stems to the same transport and quantise stingers to the next beat/bar when it improves responsiveness. Example (Street Meat): aim → flight → danger → feeding. The actual game defines its own states.

Never restart the menu loop on every screen change. The Android host sets `WebSettings.mediaPlaybackRequiresUserGesture = false`, creates its AudioContext and begins decoding at app start; test the actual host because device audio policy still matters. Browsers attempt autoplay and then retry on the first gesture if blocked. Have one idempotent start path so repeated handlers never stack duplicate players. Persist user mute separately from suspension. Background suspends audio; returning foreground resumes permitted music but leaves gameplay paused. Check SFX/music sliders separately and honor a stored mute before starting any sound.

## Processing and tests

Keep originals in `media/source/` with licences and checksums. If the generator supplied an unwanted fade-out, find a musically aligned end, trim the tail and overlap it under the intro with at least 1 dB of headroom. Confirm the actual downbeat and bar count by ear/waveform; arbitrary second cuts are not a general recipe. Example (Street Meat): edits from 69.8 to 65 seconds and 175.7 to 170 seconds were specific to those tracks. Re-measure integrated loudness and true peak after edits. Export Opus 80–96 kb/s plus MP3 fallback; decode and audition each runtime format, including its loop boundary.

Add a seam test measuring sample jump and adjacent-window RMS plus a headphone listen over at least three repetitions. Add `music.test` in the game for automatic start attempt, first-gesture retry, no duplicate players, persisted mute, pause, background suspension, foreground music-only resume and continuous transport during screen changes. Test state crossfades and beat-aligned stingers using a deterministic clock. A working synthetic sine loop does not prove a supplied song is seamless; record every unperformed listening/device check.

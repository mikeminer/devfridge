# Sound effects: prompt, validate, process, integrate

Use an external sound agent only with owner-authorised access, or ask the owner to supply generated files. Record provider, generation date, licence terms and any attribution in [ASSETS_LICENSES](../assets/templates/ASSETS_LICENSES.md). This toolkit does not call a paid generation API. Route mixer and runtime decisions to the vendored `audio-design` skill via [gamedev skills](gamedev-skills.md).

## One event per request

For each effect specify `filename_stem`, category (`characters`, `enemies`, `gore`, `weapons`, `impacts`, `ui`, `ambience`), duration, loop boolean, three variants and the prompt:

> ONE event; source and character (adult age, voice type, size); emotion/intensity; acoustic detail; a complete natural ending OR a seamless loop with steady intensity, no crescendo and no distinct start/end. Isolated close-mic dry recording. No music, ambience, reverb, words, intelligible syllables, footsteps, impact, Doppler or neighbouring event unless that event is the requested source.

Choose exclusions deliberately: a body impact prompt must permit its one impact; an ambience bed permits its intended ambience but excludes unrelated environments. One-shots normally last 0.5–4 s; ambience/breath loops 8–10 s; UI sounds 0.1–0.6 s. Keep exactly the same adult voice description across a recurring character's prompts. Never use childlike victims. Generate three distinct variants and audition every one: automatic hashes cannot detect a shout that sounds like an intelligible word.

### Example (Street Meat) — 20 events / 60 variants

This is a horror game example, not a mandatory tone or content set. The [manifest template](../assets/templates/sfx-manifest.example.json) contains the 20 event prompts with adult character descriptions and event-specific exclusions:

| Category | Events |
| --- | --- |
| Characters (7) | cannon_load, panic_breath (loop), whimper, scream_flight, scream_long, landing_safe, death_scream |
| Enemies (7) | idle_groan, snarl, sprint_growl, lunge_roar, horde_ambience (loop), feeding_chew, fight_growl |
| Gore (4) | flesh_tear, limb_rip_off, bone_crunch, blood_splatter |
| Impacts (1) | body_impact_street |
| Weapons (1) | cannon_fire |

The template intentionally has no real files and all validation flags are false. Supply authorised audio, inspect it and audition it; do not mark template placeholders as completed. Optional general UI additions are button tap, confirm, error, pass-activated sting, coin/buy-confirmed and pause; these six additions are outside the 20-event example and stay dry, brief and non-violent. Financial confirmation audio fires only after verified confirmation, never merely after opening the wallet.

## Input manifest and validation

Save `<stem>_<nn>.wav` with schema version 1, provider and effects containing prompt, category, planned `duration_seconds`, `loop`, files and variant count. Each file records filename, file SHA-256, PCM SHA-256, channels, `sample_rate`, frames, `sample_width` in bytes and `auditioned`. Global validation records `riff_ok`, `pcm_complete`, `distinct_hashes`, `auditioned`. Use `sfx-build.py --inspect <wav...>` to obtain actual metadata; it always sets auditioned false. A person must confirm audition, licence and voice consistency.

[sfx-build.py](../assets/sfx-build.py) checks complete RIFF size, PCM completeness (8/16/24/32-bit integer WAV), metadata and both hashes, unique PCM variants, safe relative paths and explicit audition. Float WAV is rejected; convert to integer PCM deliberately. `drop_reason` records an owner's manually rejected variant without processing it. Automatic drops and reasons are saved. Every required effect must retain a usable variant or the command fails. In particular, do not ship a silent or clipped sample just to reach three variants.

## Processing and encoding

Run `python assets/sfx-build.py <manifest.json> --out-dir <game/public/audio/sfx> --ffmpeg <local-ffmpeg-executable>`; dependencies are numpy and FFmpeg. No arguments or `--help` shows usage. All output paths are checked against the input manifest and every source before any output write; collisions are rejected so originals remain untouched.

1. Downmix to mono; compare RMS with the strongest input channel. If phase cancellation loses more than 3 dB, retain that channel and record the decision.
2. Trim with 10 ms RMS windows 45 dB below the loudest window. For one-shots apply a 4 ms onset and a configurable 30–120 ms cosine-squared tail (60 ms default). Loops skip onset/tail fades because those create a repeated dip.
3. Crossfade loop tail/head with equal-power weights: 1.5 s ambience, 0.45 s breath, configurable per effect. This shortens the loop by the overlap; output duration is recorded. Reject loops too short for the overlap. Check the final seam after limiting: jump/global-RMS ≤0.35 by default and end/start 50 ms RMS ratio between 0.5 and 2. These are engineering gates, followed by headphone audition.
4. Measure with FFmpeg `ebur128`, then adjust gain toward −16 LUFS (ambience −24, breath −26, whimper −20). Short UI cues are repeated solely for the meter's 400 ms window and marked in the report; this is not a claim of standard integrated loudness for the original 100 ms event. The output audio is not repeated.
5. Cap sample peaks at −1 dBFS using 5 ms look-ahead and no more than 6 dB limiting. If the required reduction is larger, attenuate globally first and report it. A 100 ms release reduces pumping. Re-measure; if the peak constraint prevents the target within ±1 LU, flag review and return failure. Peak safety takes priority over claiming a loudness target was met.
6. Drop silence and inputs with more than eight clipped samples; manual drops retain their reason. Example (Street Meat): `flesh_tear_01` was rejected for a hiss bed and being 17 dB quieter. Never apply that rejection to another game's same-named asset without listening.
7. Encode mono Opus at 40 kb/s for one-shots or 32 kb/s for loops, plus 44.1 kHz 56 kb/s MP3 fallback. Emit generated `sfxManifest.ts` and `processing-report.json`, including source/output hashes, trim/phase/seam/limiter decisions and measured loudness. Encoders can change peaks and loop behavior: decode/audition the actual browser-selected formats before release, particularly MP3 gap handling.

## Runtime contract

Use category voice limits, variant no-repeat and small gain/pitch jitter; replace or steal voices deliberately. Example (Street Meat): cannon 2 steal, hero 1 steal (one mouth), breath 2, enemy vocals 4, chew 2, gore 4, impact 3 steal, ambience 2 steal. Example pitch range: character ±3%, enemies ±8%; tune for the actual voice.

Document and test an event-to-sound map for fire, flight, landing, grab, chew, tear and UI confirmations. Gore Off suppresses all gore sounds; Reduced thins gore density and removes dismemberment sounds. Keep ordinary impact/UI sounds independent. Pause cuts ongoing character voice; background suspends audio; resuming foreground never restarts gameplay automatically. Offer separate music and SFX volume sliders with persisted mute.

Keep procedural Web Audio fallback until samples decode. An unavailable file must not block play. Test voice stealing, nonrepeat, pause/background, mute, gore settings, pending-vs-confirmed purchase audio and fallback routing. These are game-specific tests, not proven by successful file encoding.

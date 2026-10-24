# Music generation brief

## Blank — fill and obtain owner/provider authorisation

- Game / genre / setting: <NAME / GENRE / SETTING>
- Mood (3–5 words): <MOODS>
- Instrumentation or era: <INSTRUMENTS / ERA>; no living artist imitation.
- Avoid: intelligible words, copyrighted melodies, sudden silence, <GAME-SPECIFIC EXCLUSIONS>.
- Provider/account terms checked: <DATE / LINK>; authorised cost/access: <RECORD>.
- Delivery: stereo 48 kHz PCM originals, integrated −14 to −16 LUFS, true peak ≤−1 dBTP; measure after export.

| Cue | BPM / key / meter | Length and exact loop markers | Content |
| --- | --- | --- | --- |
| Menu | <BPM / KEY / METER> | 60–75 s; <BAR-ALIGNED START/END>, no fades | <inviting mood matched to game> |
| Gameplay | <BPM / KEY / METER> | 120–180 s; <BAR-ALIGNED LOOP>, no fades | Steady energy, leave 1–4 kHz space for SFX |
| Stems | Same as gameplay | Same start, sample count and loop markers | Base, rhythm, tension, danger; separately rendered |
| Stingers | Same key, explicit tempo | 1–4 s, no loop | Level start, near miss, success, failure, pass activated, new record |
| Victory / defeat | <BPM / KEY / METER> | 5–10 s each, tonic ending, no loop | <emotion> |
| Optional ambience | No melody | <loop markers> | <environment> |

Prompt to the music agent:

> Compose original music for <GAME>. It is a <GENRE> game set in <SETTING>, with <MOODS>. Use <INSTRUMENTS/ERA>. Produce the cue table above with exact aligned loop boundaries and identical sample length across gameplay stems. Avoid words, imitation of identifiable artists, existing melodies, sudden silence and <EXCLUSIONS>. Loop cues must have no fade-in or fade-out. Deliver stereo 48 kHz PCM masters and separate stems with BPM, key, meter and bar markers. Target −14 to −16 LUFS and ≤−1 dBTP. Leave room for character voices in 1–4 kHz. This is original game music, not a sound-alike request.

Integration: retain originals in `media/source/`, record licences, measure levels, trim/crossfade unwanted tails only at musical boundaries, audition three loop repetitions, encode Opus 80–96 kb/s plus MP3. Use separate music/SFX/UI buses; duck music 4–6 dB under character screams/stingers; crossfade aligned layers; quantise suitable stingers; preserve transport between menus. Test autoplay attempt, one gesture fallback, persisted mute, suspension and music-only foreground resume.

## Example (Street Meat style) — optional original horror-street brief

Game concept: an adult horror-street arcade game. Mood: ominous, playful, tense, gritty. Instrumentation: detuned analogue bass, pizzicato strings, brushed metal percussion, restrained wordless adult choir; no artist references, existing melodies, words or child voices. Keep the frightening tone under owner-approved content settings.

Menu: 120 BPM, D minor, 4/4, 32 bars = 64 seconds; inviting but ominous, precise start/end downbeats, no fades. Gameplay: 96 BPM, D minor, 4/4, 64 bars = 160 seconds; leave voice space, stable pulse. Gameplay stems (base/rhythm/tension/danger) share all 160 seconds and phase-aligned start. Stingers: 1–4 seconds, D minor; six events from the blank brief. Victory: 7 seconds resolving to D; defeat: 8 seconds resolving to D, nonlooping. Optional street-wind ambience has no voices, traffic beats or melody. Deliver the same measured formats as the blank brief. This is a style example, not a requirement for another game.

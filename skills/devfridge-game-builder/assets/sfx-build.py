#!/usr/bin/env python3
"""Validate auditioned PCM WAV variants, process audio, encode and emit runtime manifests.

Dependencies: numpy and a caller-selected ffmpeg executable. No network calls.
"""
import argparse
from collections import deque
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import wave
import numpy as np

PEAK = 10 ** (-1 / 20)


def preflight_outputs(outputs, inputs):
    resolved = [path.resolve() for path in outputs]
    if len(set(resolved)) != len(resolved):
        raise ValueError("Output paths must be unique.")
    for output in resolved:
        for source in inputs:
            if output == source.resolve() or (output.exists() and source.exists() and output.samefile(source)):
                raise ValueError("An output would overwrite an input; choose separate output paths.")
        if any(parent.is_file() for parent in output.parents):
            raise ValueError("An output parent is a file.")


def read_pcm(path):
    blob = path.read_bytes()
    if len(blob) < 12 or blob[:4] != b"RIFF" or blob[8:12] != b"WAVE" or int.from_bytes(blob[4:8], "little") + 8 != len(blob):
        raise ValueError("Incomplete RIFF WAV: " + path.name)
    with wave.open(str(path), "rb") as wav:
        channels, width, rate, frames = wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getnframes()
        raw = wav.readframes(frames)
        if wav.getcomptype() != "NONE" or width not in (1, 2, 3, 4) or not 1 <= channels <= 8 or rate < 8000 or frames <= 0 or len(raw) != frames * channels * width:
            raise ValueError("Unsupported or incomplete PCM: " + path.name)
    if width == 1:
        data = (np.frombuffer(raw, np.uint8).astype(np.float64) - 128) / 128
    elif width == 3:
        bytes3 = np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(np.int32)
        ints = bytes3[:, 0] | (bytes3[:, 1] << 8) | (bytes3[:, 2] << 16)
        data = ((ints ^ 0x800000) - 0x800000).astype(np.float64) / 8388608
    else:
        data = np.frombuffer(raw, "<i" + str(width)).astype(np.float64) / (2 ** (width * 8 - 1))
    metadata = {"sha256": hashlib.sha256(blob).hexdigest(), "pcm_sha256": hashlib.sha256(raw).hexdigest(), "channels": channels, "sample_rate": rate, "frames": frames, "sample_width": width}
    return data.reshape(-1, channels), rate, metadata


def rms(samples):
    return float(np.sqrt(np.mean(np.square(samples)))) if len(samples) else 0.0


def downmix(samples):
    channel_rms = np.sqrt(np.mean(samples ** 2, axis=0))
    strongest = int(np.argmax(channel_rms))
    mono = np.mean(samples, axis=1)
    cancellation = 20 * math.log10(max(float(channel_rms[strongest]), 1e-12) / max(rms(mono), 1e-12))
    fallback = cancellation > 3
    return (samples[:, strongest].copy() if fallback else mono), {"phase_loss_db": round(cancellation, 3), "kept_channel": strongest if fallback else None}


def trim_silence(samples, rate):
    # A 10 ms RMS window, 45 dB below the loudest window, preserves quiet tails.
    window = max(1, round(rate * .01))
    levels = np.array([rms(samples[i:i + window]) for i in range(0, len(samples), window)])
    threshold = float(levels.max()) * 10 ** (-45 / 20)
    active = np.flatnonzero(levels > max(threshold, 1e-8))
    if not len(active):
        raise ValueError("silent")
    first, last = int(active[0] * window), min(len(samples), int((active[-1] + 1) * window))
    return samples[first:last].copy(), {"trimmed_start_frames": first, "trimmed_end_frames": len(samples) - last}


def fades(samples, rate, fade_out_ms=60):
    result = samples.copy()
    start, end = min(len(result) // 2, round(rate * .004)), min(len(result) // 2, round(rate * fade_out_ms / 1000))
    if start:
        result[:start] *= np.sin(np.linspace(0, np.pi / 2, start)) ** 2
    if end:
        result[-end:] *= np.cos(np.linspace(0, np.pi / 2, end)) ** 2
    return result


def loop_crossfade(samples, rate, seconds):
    count = round(seconds * rate)
    if count < 2 or len(samples) < count * 3:
        raise ValueError("loop too short for crossfade")
    angle = np.linspace(0, np.pi / 2, count)
    blend = samples[-count:] * np.cos(angle) + samples[:count] * np.sin(angle)
    return np.concatenate((samples[count:-count], blend))


def seam_metrics(samples, rate):
    window = min(len(samples) // 4, max(1, round(rate * .05)))
    level = max(rms(samples), 1e-9)
    return {"jump_ratio": abs(float(samples[-1] - samples[0])) / level,
            "rms_ratio": rms(samples[-window:]) / max(rms(samples[:window]), 1e-9)}


def write_pcm(path, samples, rate):
    pcm = np.round(np.clip(samples, -1, 1 - 1 / 32768) * 32768).astype("<i2")
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(pcm.tobytes())


def run_ffmpeg(binary, args):
    completed = subprocess.run([str(binary), "-hide_banner", "-nostdin", "-xerror", "-y", *map(str, args)], capture_output=True, text=True)
    if completed.returncode:
        raise ValueError("ffmpeg failed; check the local input, encoder availability and configured executable")
    return completed.stderr


def measure_lufs(samples, rate, binary, directory):
    # EBU gating needs 400 ms. Short UI cues are repeated only for measurement.
    measurement = samples
    repeated = len(samples) < rate * .4
    if repeated:
        measurement = np.tile(samples, math.ceil(rate * .5 / len(samples)))
    path = directory / "measurement.wav"
    write_pcm(path, measurement, rate)
    # These files are our canonical PCM16 output. Force that decoder: some builds
    # can mis-probe synthetic periodic PCM as an MPEG elementary stream.
    log = run_ffmpeg(binary, ["-c:a", "pcm_s16le", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"])
    values = re.findall(r"I:\s*(-?\d+(?:\.\d+)?)\s+LUFS", log)
    if not values or float(values[-1]) <= -69:
        raise ValueError("audio below loudness meter gate")
    return float(values[-1]), repeated


def limit_peak(samples, rate):
    peak = float(np.max(np.abs(samples)))
    maximum_reduction = 10 ** (-6 / 20)
    pre_gain = min(1.0, PEAK / max(peak * maximum_reduction, 1e-12))
    data = samples * pre_gain
    # Five milliseconds of look-ahead with an O(n) sliding maximum.
    ahead = max(1, round(rate * .005))
    absolute = np.abs(data)
    maxima = np.zeros(len(data))
    queue = deque()
    for i in range(len(data) - 1, -1, -1):
        while queue and queue[0] > i + ahead:
            queue.popleft()
        while queue and absolute[queue[-1]] <= absolute[i]:
            queue.pop()
        queue.append(i)
        maxima[i] = absolute[queue[0]]
    requested = np.maximum(maximum_reduction, np.minimum(1, PEAK / np.maximum(maxima, 1e-12)))
    gain, release, envelope = 1.0, math.exp(-1 / (rate * .1)), np.empty(len(data))
    for i, value in enumerate(requested):
        gain = min(float(value), 1 - (1 - gain) * release)
        envelope[i] = gain
    result = data * envelope
    return result, {"pre_attenuation_db": -20 * math.log10(pre_gain), "limiter_max_reduction_db": -20 * math.log10(float(envelope.min()))}


def process_manifest(manifest_path, out_dir, ffmpeg, fade_out_ms=60, max_seam_jump=.35):
    manifest_path, out_dir = Path(manifest_path), Path(out_dir)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 1 or not manifest.get("provider") or not isinstance(manifest.get("effects"), list) or not manifest["effects"]:
        raise ValueError("Manifest needs schema_version 1, provider and nonempty effects.")
    if not 30 <= fade_out_ms <= 120:
        raise ValueError("Fade-out must be 30–120 ms.")
    validation = manifest.get("validation", {})
    if any(validation.get(k) is not True for k in ("riff_ok", "pcm_complete", "distinct_hashes", "auditioned")):
        raise ValueError("Validate RIFF, complete PCM, distinct variants and audition every file before building.")
    outputs = [out_dir / "processing-report.json", out_dir / "sfxManifest.ts"]
    inputs = [manifest_path]
    for effect in manifest["effects"]:
        stem = effect.get("filename_stem", "")
        if not re.fullmatch(r"[a-z][a-z0-9_]{0,63}", stem):
            raise ValueError("Every effect needs a safe filename_stem.")
        for index, entry in enumerate(effect.get("files", []), 1):
            filename = entry.get("filename", "")
            if not isinstance(filename, str) or not filename:
                raise ValueError("Every file entry needs a filename.")
            source = (manifest_path.parent / filename).resolve()
            if not source.is_relative_to(manifest_path.parent.resolve()):
                raise ValueError("WAV paths must stay inside the manifest directory.")
            inputs.append(source)
            outputs.extend(out_dir / f"{stem}_{index:02}{suffix}" for suffix in (".opus", ".mp3"))
    preflight_outputs(outputs, inputs)
    out_dir.mkdir(parents=True, exist_ok=True)
    results, runtime, seen_hashes, seen_stems = [], {}, set(), set()
    with tempfile.TemporaryDirectory(prefix="sfx-build-") as temp:
        temp_dir = Path(temp)
        for effect in manifest["effects"]:
            stem = effect.get("filename_stem", "")
            if not re.fullmatch(r"[a-z][a-z0-9_]{0,63}", stem) or stem in seen_stems:
                raise ValueError("Every effect needs a unique safe filename_stem.")
            seen_stems.add(stem)
            if not effect.get("prompt") or not isinstance(effect.get("loop"), bool) or not isinstance(effect.get("duration_seconds"), (int, float)) or effect["duration_seconds"] <= 0:
                raise ValueError("Effect needs prompt, positive duration_seconds and boolean loop.")
            category = effect.get("category", "impacts")
            target = effect.get("target_lufs", -26 if "breath" in stem else -20 if "whimper" in stem else -24 if category == "ambience" or "ambience" in stem else -16)
            if not -36 <= target <= -10:
                raise ValueError("target_lufs must be between -36 and -10.")
            runtime[stem] = []
            files = effect.get("files", [])
            if not files:
                raise ValueError("Each effect needs auditioned WAV files.")
            if "variants" in effect and effect["variants"] != len(files):
                raise ValueError("variants must match the number of file entries, including documented drops.")
            for index, entry in enumerate(files, 1):
                filename = entry.get("filename", "")
                path = (manifest_path.parent / filename).resolve()
                if not path.is_relative_to(manifest_path.parent.resolve()):
                    raise ValueError("WAV paths must stay inside the manifest directory.")
                item = {"effect": stem, "input": filename, "status": "dropped"}
                results.append(item)
                if entry.get("drop_reason"):
                    item["reason"] = str(entry["drop_reason"])
                    continue
                if entry.get("auditioned") is not True:
                    raise ValueError("An input has not been auditioned: " + filename)
                samples, rate, metadata = read_pcm(path)
                if any(entry.get(k) != value for k, value in metadata.items()):
                    raise ValueError("PCM metadata or hashes do not match: " + filename)
                if metadata["pcm_sha256"] in seen_hashes:
                    raise ValueError("Duplicate PCM variant: " + filename)
                seen_hashes.add(metadata["pcm_sha256"])
                item["input_metadata"] = metadata
                quantizer_peak = 1 - 1 / (2 ** (metadata["sample_width"] * 8 - 1))
                if np.count_nonzero(np.abs(samples) >= quantizer_peak) > 8:
                    item["reason"] = "input has more than eight clipped samples"
                    continue
                if rms(samples) < 1e-7:
                    item["reason"] = "silent"
                    continue
                mono, phase = downmix(samples)
                item.update(phase)
                try:
                    mono, trim = trim_silence(mono, rate)
                    item.update(trim)
                    if effect["loop"]:
                        crossfade = effect.get("crossfade_seconds", .45 if "breath" in stem else 1.5)
                        mono = loop_crossfade(mono, rate, crossfade)
                    else:
                        mono = fades(mono, rate, fade_out_ms)
                    measured, repeated = measure_lufs(mono, rate, ffmpeg, temp_dir)
                    item.update({"input_lufs": measured, "target_lufs": target, "short_cue_measurement_repeated": repeated})
                    mono *= 10 ** ((target - measured) / 20)
                    mono, limiter = limit_peak(mono, rate)
                    item.update(limiter)
                    # Peak limiting can shift the loop envelope; test the final signal.
                    if effect["loop"]:
                        item["seam"] = seam_metrics(mono, rate)
                        if item["seam"]["jump_ratio"] > max_seam_jump or not .5 <= item["seam"]["rms_ratio"] <= 2:
                            raise ValueError("loop seam failed; re-edit and audition")
                    item["output_lufs"], _ = measure_lufs(mono, rate, ffmpeg, temp_dir)
                    item["target_lufs_reached"] = abs(item["output_lufs"] - target) <= 1
                    item["peak_dbfs"] = 20 * math.log10(max(float(np.max(np.abs(mono))), 1e-12))
                    processed = temp_dir / "processed.wav"
                    write_pcm(processed, mono, rate)
                    base = f"{stem}_{index:02}"
                    opus, mp3 = out_dir / (base + ".opus"), out_dir / (base + ".mp3")
                    run_ffmpeg(ffmpeg, ["-c:a", "pcm_s16le", "-i", processed, "-ac", "1", "-c:a", "libopus", "-b:a", "32k" if effect["loop"] else "40k", opus])
                    run_ffmpeg(ffmpeg, ["-c:a", "pcm_s16le", "-i", processed, "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "56k", mp3])
                    item.update({"status": "accepted", "duration_seconds": len(mono) / rate, "outputs": {f.name: hashlib.sha256(f.read_bytes()).hexdigest() for f in (opus, mp3)}})
                    runtime[stem].append({"opus": opus.name, "mp3": mp3.name, "loop": effect["loop"], "category": category, "duration": len(mono) / rate})
                except ValueError as error:
                    item["reason"] = str(error)
    report = {"schema_version": 1, "provider": manifest["provider"], "effects": results, "empty_effects": [key for key, value in runtime.items() if not value], "review_required": [x["input"] for x in results if x.get("status") == "accepted" and not x.get("target_lufs_reached")]}
    (out_dir / "processing-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (out_dir / "sfxManifest.ts").write_text("// Generated by sfx-build.py. Do not edit by hand.\nexport const sfxManifest = " + json.dumps(runtime, indent=2) + " as const;\n", encoding="utf-8")
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("manifest", type=Path, nargs="?")
    p.add_argument("--out-dir", type=Path)
    p.add_argument("--ffmpeg", default="ffmpeg", help="Local executable path, never a download URL.")
    p.add_argument("--fade-out-ms", type=int, default=60)
    p.add_argument("--max-seam-jump", type=float, default=.35)
    p.add_argument("--inspect", type=Path, nargs="+", help="Print WAV metadata for manifest creation; audition flags must still be set by a person.")
    if len(sys.argv) == 1:
        p.print_help()
        return 0
    a = p.parse_args()
    try:
        if a.inspect:
            print(json.dumps([{"filename": f.name, **read_pcm(f)[2], "auditioned": False} for f in a.inspect], indent=2))
            return 0
        if not a.manifest or not a.out_dir:
            p.error("Provide manifest and --out-dir.")
        report = process_manifest(a.manifest, a.out_dir, a.ffmpeg, a.fade_out_ms, a.max_seam_jump)
        print(f"Processed {len(report['effects'])} variants; {len(report['empty_effects'])} effects have no usable variants; {len(report['review_required'])} need loudness review.")
        return 1 if report["empty_effects"] or report["review_required"] else 0
    except (ValueError, OSError, wave.Error, KeyError, TypeError) as error:
        p.error(str(error))


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Caption genuine game captures; validate the final Store screenshot set."""
import argparse
import json
from pathlib import Path
import sys
from PIL import Image, ImageColor, ImageDraw, ImageFont, ImageOps


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


def validate(paths, minimum=4, maximum=8, max_bytes=3_000_000):
    if len({path.resolve() for path in paths}) != len(paths):
        raise ValueError("Screenshot paths must be unique.")
    if not minimum <= len(paths) <= maximum:
        raise ValueError(f"Expected {minimum}–{maximum} screenshots.")
    size = None
    for path in paths:
        with Image.open(path) as im:
            if im.format not in {"JPEG", "PNG", "GIF", "WEBP"}:
                raise ValueError("Unsupported screenshot format: " + path.name)
            if im.width * 16 != im.height * 9 and im.width * 9 != im.height * 16:
                raise ValueError("Screenshot must be 9:16 or 16:9: " + path.name)
            if size is not None and im.size != size:
                raise ValueError("Screenshot dimensions differ: " + path.name)
            size = im.size
            if min(im.size) < 1080:
                raise ValueError("This quality gate requires a shortest edge of at least 1080 px: " + path.name)
        if path.stat().st_size > max_bytes:
            raise ValueError("Screenshot exceeds byte budget: " + path.name)
    return size


def compose(captions_file, output_dir, font_path, size, band_height, palette, font_size):
    captions_file, output_dir, font_path = Path(captions_file), Path(output_dir), Path(font_path)
    entries = json.loads(captions_file.read_text(encoding="utf-8"))
    if not isinstance(entries, list) or not entries:
        raise ValueError("Captions JSON must be a nonempty array of {image, caption, output?}.")
    width, height = size
    if not 0 < band_height < height // 2:
        raise ValueError("Band height must be positive and smaller than half the frame.")
    bg, foreground, outline = [ImageColor.getrgb(c) for c in palette]
    plans = []
    for i, entry in enumerate(entries):
        text = entry["caption"]
        if not isinstance(text, str) or not text.strip() or len(text) > 110:
            raise ValueError("Captions must be 1–110 characters.")
        source = Path(entry["image"])
        if not source.is_absolute():
            source = captions_file.parent / source
        name = entry.get("output", f"screenshot-{i + 1:02}.jpg")
        if Path(name).name != name or Path(name).suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise ValueError("Output must be a simple JPG, PNG or WebP filename.")
        plans.append((source, text, output_dir / name))
    preflight_outputs([plan[2] for plan in plans], [captions_file, font_path, *[plan[0] for plan in plans]])
    output_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for source, text, dest in plans:
        # Contain preserves the complete HUD. Do not stretch or invent gameplay.
        frame = Image.new("RGB", (width, height), bg)
        with Image.open(source) as image:
            fit = ImageOps.contain(image.convert("RGB"), (width, height - band_height), method=Image.Resampling.LANCZOS)
        frame.paste(fit, ((width - fit.width) // 2, band_height + (height - band_height - fit.height) // 2))
        draw = ImageDraw.Draw(frame)
        font = ImageFont.truetype(str(font_path), font_size)
        lines = text.upper().split("\n")
        while font.size > 16:
            bounds = draw.multiline_textbbox((0, 0), "\n".join(lines), font=font, spacing=8, stroke_width=2, align="center")
            if bounds[2] - bounds[0] <= width - 72 and bounds[3] - bounds[1] <= band_height - 36:
                break
            font = ImageFont.truetype(str(font_path), font.size - 2)
        bounds = draw.multiline_textbbox((0, 0), "\n".join(lines), font=font, spacing=8, stroke_width=2, align="center")
        if bounds[2] - bounds[0] > width - 72 or bounds[3] - bounds[1] > band_height - 36:
            raise ValueError("Caption does not fit; shorten it.")
        xy = ((width - (bounds[2] - bounds[0])) / 2 - bounds[0], (band_height - (bounds[3] - bounds[1])) / 2 - bounds[1])
        draw.multiline_text(xy, "\n".join(lines), fill=foreground, font=font, spacing=8, stroke_width=2, stroke_fill=outline, align="center")
        options = {"quality": 92} if dest.suffix.lower() != ".png" else {"optimize": True}
        frame.save(dest, **options)
        paths.append(dest)
    return paths


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("captions", type=Path, nargs="?")
    p.add_argument("--out-dir", type=Path)
    p.add_argument("--font", type=Path, help="Owner-selected licensed TTF/OTF. Copy its licence into the Store asset package.")
    p.add_argument("--size", choices=("1080x1920", "1920x1080"), default="1080x1920")
    p.add_argument("--band-height", type=int, default=240)
    p.add_argument("--font-size", type=int, default=84)
    p.add_argument("--palette", nargs=3, default=["#13202b", "#fff4d6", "#071018"], metavar=("BACKGROUND", "TEXT", "OUTLINE"))
    p.add_argument("--validate", nargs="+", type=Path, help="Validate an existing 4–8 image set instead of composing.")
    p.add_argument("--check-set", action="store_true", help="Validate generated count, aspect, dimensions and 3 MB limit.")
    if len(sys.argv) == 1:
        p.print_help()
        return 0
    a = p.parse_args()
    try:
        if a.validate:
            validate(a.validate)
            print("Screenshot set passed.")
        else:
            if not a.captions or not a.out_dir or not a.font:
                p.error("Composition needs captions, --out-dir and --font.")
            paths = compose(a.captions, a.out_dir, a.font, tuple(map(int, a.size.split("x"))), a.band_height, a.palette, a.font_size)
            if a.check_set:
                validate(paths)
            print(f"Composed {len(paths)} screenshots. Human review must confirm captions and gameplay are truthful.")
    except (ValueError, OSError, KeyError, TypeError) as error:
        p.error(str(error))
    return 0


if __name__ == "__main__":
    sys.exit(main())

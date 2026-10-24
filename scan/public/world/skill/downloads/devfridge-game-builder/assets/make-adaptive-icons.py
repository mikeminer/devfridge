#!/usr/bin/env python3
"""Build Android adaptive/legacy icons, an opaque store icon and mask previews."""
import argparse
from pathlib import Path
import sys
from PIL import Image, ImageColor, ImageDraw, ImageOps

DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
RESAMPLE = Image.Resampling.LANCZOS


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


def create_icons(source, res_dir, store_dir, background="#151b22", center=None, radius=None, full_bleed=False):
    source, res_dir, store_dir = Path(source), Path(res_dir), Path(store_dir)
    outputs = [res_dir / ("mipmap-" + density) / filename for density in DENSITIES for filename in
               ("ic_launcher_background.png", "ic_launcher_foreground.png", "ic_launcher_monochrome.png", "ic_launcher.png", "ic_launcher_round.png")]
    outputs += [res_dir / "mipmap-anydpi-v26" / name for name in ("ic_launcher.xml", "ic_launcher_round.xml")]
    outputs += [store_dir / "icon-512.png", store_dir / "launcher-masks.png"]
    preflight_outputs(outputs, [source])
    rgb = ImageColor.getrgb(background)
    if len(rgb) != 3 or min(rgb) > 235:
        raise ValueError("Choose an opaque, non-white background.")
    artwork = Image.open(source).convert("RGBA")
    if not full_bleed:
        cx, cy = center or (artwork.width / 2, artwork.height / 2)
        radius = radius or min(artwork.size) / 2
        if radius <= 0 or cx - radius < 0 or cy - radius < 0 or cx + radius > artwork.width or cy + radius > artwork.height:
            raise ValueError("Badge circle must be inside the source image.")
        artwork = artwork.crop((round(cx - radius), round(cy - radius), round(cx + radius), round(cy + radius)))
        alpha = Image.new("L", artwork.size)
        ImageDraw.Draw(alpha).ellipse((0, 0, artwork.width - 1, artwork.height - 1), fill=255)
        import PIL.ImageChops
        artwork.putalpha(PIL.ImageChops.multiply(artwork.getchannel("A"), alpha))
    for density, scale in DENSITIES.items():
        dest = res_dir / ("mipmap-" + density)
        dest.mkdir(parents=True, exist_ok=True)
        size, safe = round(108 * scale), round(66 * scale)
        back = Image.new("RGB", (size, size), rgb)
        if full_bleed:
            backdrop = ImageOps.fit(artwork, (size, size), method=RESAMPLE)
            back.paste(backdrop, (0, 0), backdrop)
        front = Image.new("RGBA", (size, size))
        badge = ImageOps.contain(artwork, (safe, safe), method=RESAMPLE)
        front.alpha_composite(badge, ((size - badge.width) // 2, (size - badge.height) // 2))
        mono = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        mono.putalpha(front.getchannel("A"))
        back.save(dest / "ic_launcher_background.png")
        front.save(dest / "ic_launcher_foreground.png")
        mono.save(dest / "ic_launcher_monochrome.png")
        legacy_size = round(48 * scale)
        legacy = Image.new("RGB", (legacy_size, legacy_size), rgb)
        crop = ImageOps.fit(artwork, (legacy_size, legacy_size), method=RESAMPLE)
        legacy.paste(crop, (0, 0), crop)
        for name in ("ic_launcher.png", "ic_launcher_round.png"):
            legacy.save(dest / name)
    xml_dir = res_dir / "mipmap-anydpi-v26"
    xml_dir.mkdir(parents=True, exist_ok=True)
    xml = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@mipmap/ic_launcher_background" />\n  <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n  <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />\n</adaptive-icon>\n'
    for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
        (xml_dir / name).write_text(xml, encoding="utf-8")
    store_dir.mkdir(parents=True, exist_ok=True)
    store = Image.new("RGB", (512, 512), rgb)
    crop = ImageOps.fit(artwork, (512, 512), method=RESAMPLE)
    store.paste(crop, (0, 0), crop)
    store.save(store_dir / "icon-512.png")
    previews = Image.new("RGB", (3 * 280, 2 * 280))
    for row, wall in enumerate(("#f2f2f2", "#171717")):
        for col, shape in enumerate(("circle", "squircle", "rounded-square")):
            tile = Image.new("RGB", (280, 280), wall)
            mask = Image.new("L", (232, 232))
            draw = ImageDraw.Draw(mask)
            if shape == "circle":
                draw.ellipse((0, 0, 231, 231), fill=255)
            else:
                draw.rounded_rectangle((0, 0, 231, 231), radius=75 if shape == "squircle" else 38, fill=255)
            # Preview the real adaptive compositing, including safe inset foreground.
            composite = Image.open(res_dir / "mipmap-xxxhdpi/ic_launcher_background.png").convert("RGBA")
            composite.alpha_composite(Image.open(res_dir / "mipmap-xxxhdpi/ic_launcher_foreground.png"))
            # Launchers display the central 72 dp of 108 dp layers; outer artwork
            # is overscan for parallax. Preview that viewport, not the full layer.
            composite = composite.crop((72, 72, 360, 360))
            tile.paste(composite.resize((232, 232), RESAMPLE), (24, 12), mask)
            ImageDraw.Draw(tile).text((24, 252), shape, fill="#fff" if row else "#111")
            previews.paste(tile, (col * 280, row * 280))
    previews.save(store_dir / "launcher-masks.png")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("source", type=Path)
    p.add_argument("--res-dir", type=Path, required=True)
    p.add_argument("--store-dir", type=Path, required=True)
    p.add_argument("--background", default="#151b22")
    p.add_argument("--badge-center", nargs=2, type=float, metavar=("X", "Y"))
    p.add_argument("--badge-radius", type=float)
    p.add_argument("--full-bleed", action="store_true")
    if len(sys.argv) == 1:
        p.print_help()
        return 0
    a = p.parse_args()
    try:
        create_icons(a.source, a.res_dir, a.store_dir, a.background, a.badge_center, a.badge_radius, a.full_bleed)
    except (ValueError, OSError) as error:
        p.error(str(error))
    print("Icons generated. Set manifest icon/roundIcon, review masks, then verify on a physical device.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Prepara una copia ligera del sitio para la publicación en GitHub Pages."""

from pathlib import Path
from shutil import copy2, copytree, rmtree
from PIL import Image


ROOT = Path(__file__).resolve().parent
DEST = ROOT / "output" / "site"
MAX_BYTES = 700_000


def optimize_image(path: Path) -> None:
    if path.stat().st_size <= MAX_BYTES:
        return

    suffix = path.suffix.lower()
    with Image.open(path) as original:
        image = original.copy()
        if image.width > 2000 or image.height > 2000:
            image.thumbnail((2000, 2000), Image.Resampling.LANCZOS)

        while True:
            if suffix in {".jpg", ".jpeg"}:
                image.convert("RGB").save(path, "JPEG", quality=82, optimize=True, progressive=True)
            else:
                rgba = image.convert("RGBA")
                palette = rgba.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
                palette.save(path, "PNG", optimize=True)

            if path.stat().st_size <= MAX_BYTES:
                break
            image = image.resize(
                (max(1, int(image.width * 0.86)), max(1, int(image.height * 0.86))),
                Image.Resampling.LANCZOS,
            )


if DEST.exists():
    rmtree(DEST)
DEST.mkdir(parents=True)

for name in ("index.html", "app.js", "style.css", "design-targets.json", ".nojekyll", "README.md"):
    copy2(ROOT / name, DEST / name)

copytree(ROOT / "assets", DEST / "assets")
copytree(ROOT / "contenidos", DEST / "contenidos")
copytree(ROOT / ".github", DEST / ".github")

for image_path in (DEST / "assets").rglob("*"):
    if image_path.suffix.lower() in {".png", ".jpg", ".jpeg"}:
        optimize_image(image_path)

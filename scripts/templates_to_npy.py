"""Convertit un export du Studio Signa en dataset pour le projet Python signa-lsf.

Usage :
    python scripts/templates_to_npy.py signa-references-2026-10-29.json ../signa-lsf/data

Crée data/<signe>/<n>.npy (tableaux 30 × 203), exactement le format attendu par
`python -m src.train`. Les features sont normalisées de la même façon des deux côtés.
"""
import json
import sys
from pathlib import Path

import numpy as np


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    data = json.loads(src.read_text(encoding="utf-8"))
    templates = data["templates"] if isinstance(data, dict) else data

    written = 0
    for t in templates:
        frames = np.asarray(t["frames"], dtype=np.float32)
        if frames.shape != (30, 203):
            print(f"[ignoré] {t.get('id')} : forme {frames.shape}")
            continue
        sign_dir = out / t["signSlug"]
        sign_dir.mkdir(parents=True, exist_ok=True)
        idx = len(list(sign_dir.glob("*.npy")))
        np.save(sign_dir / f"{idx}.npy", frames)
        written += 1
    print(f"{written} séquences écrites dans {out}")


if __name__ == "__main__":
    main()

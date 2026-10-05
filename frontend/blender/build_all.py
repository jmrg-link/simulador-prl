"""Genera todos los modelos del simulador y los exporta a public/models/.

Uso (desde frontend/): `pnpm run assets`, que ejecuta
`blender -b --factory-startup --python blender/build_all.py`. Con la variable BLENDER se indica
otro binario. Descarga a blender/.cache/ los assets CC0 de Poly Haven que necesite y escribe su
lista en public/models/SOURCES.txt, junto al HDRI de iluminación (workshop.hdr) y la panorámica del
fondo (workshop-fondo.jpg). Los archivos resultantes se versionan, así que la aplicación no necesita
Blender.
"""

import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import polyhaven
from common import export_glb, reset_scene, resized_jpeg
from trainee import goggles, trainee
from workshop import workshop

OUTPUT = Path(__file__).resolve().parent.parent / "public" / "models"
ASSETS = [lambda: workshop(polyhaven.CACHE), trainee, goggles]
ENVIRONMENT = "empty_warehouse_01"
BACKGROUND_SIZE = (4096, 2048)


def main() -> None:
    """Construye cada asset en una escena limpia, lo exporta y registra las fuentes usadas."""
    for build in ASSETS:
        reset_scene()
        filename = build()
        export_glb(OUTPUT / filename)
        print(f"[assets] {filename} {(OUTPUT / filename).stat().st_size // 1024} KiB")
    shutil.copyfile(polyhaven.hdri(ENVIRONMENT), OUTPUT / "workshop.hdr")
    resized_jpeg(polyhaven.tonemapped(ENVIRONMENT), OUTPUT / "workshop-fondo.jpg", BACKGROUND_SIZE)
    lines = [f"{asset}  https://polyhaven.com/a/{asset}  CC0" for asset in sorted(polyhaven.SOURCES)]
    (OUTPUT / "SOURCES.txt").write_text("Assets de Poly Haven (CC0) usados en los modelos:\n" + "\n".join(lines) + "\n")


main()

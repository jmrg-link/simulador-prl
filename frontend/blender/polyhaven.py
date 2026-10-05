"""Descarga con caché de assets CC0 de Poly Haven (modelos glTF, texturas PBR y HDRI) a 1k.

La caché vive en blender/.cache/ y no se versiona; los .glb generados sí. La lista de assets
usados queda en SOURCES para poder citarlos aunque la licencia CC0 no lo exija.
"""

import json
import urllib.request
from pathlib import Path

API = "https://api.polyhaven.com/files/"
CACHE = Path(__file__).resolve().parent / ".cache"
RESOLUTION = "1k"
HEADERS = {"User-Agent": "simulador-prl-assets/0.1"}
SOURCES: set[str] = set()


def _open(url: str, timeout: int) -> bytes:
    """Descarga `url` con el User-Agent propio que exige la API de Poly Haven."""
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=timeout) as response:
        return response.read()


def _fetch_json(asset: str) -> dict:
    """Índice de archivos de un asset, cacheado en disco."""
    path = CACHE / asset / "files.json"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(_open(API + asset, 60))
    return json.loads(path.read_text())


def _download(url: str, target: Path) -> Path:
    """Descarga `url` en `target` si aún no existe."""
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(_open(url, 120))
    return target


def model(asset: str) -> Path:
    """Ruta local del .gltf del modelo con su .bin y texturas al lado."""
    SOURCES.add(asset)
    entry = _fetch_json(asset)["gltf"][RESOLUTION]["gltf"]
    folder = CACHE / asset / "gltf"
    for relative, item in entry["include"].items():
        _download(item["url"], folder / relative)
    return _download(entry["url"], folder / Path(entry["url"]).name)


def texture(asset: str) -> dict[str, Path]:
    """Mapas difuso, normal (OpenGL) y rugosidad de una textura, en JPG. Las texturas que solo
    publican variantes de color (`col_1`…) no traen `diffuse`: se usan con un color plano."""
    SOURCES.add(asset)
    files = _fetch_json(asset)
    maps = {"diffuse": "Diffuse", "normal": "nor_gl", "roughness": "Rough"}
    result = {}
    for key, name in maps.items():
        if name not in files:
            continue
        url = files[name][RESOLUTION]["jpg"]["url"]
        result[key] = _download(url, CACHE / asset / "tex" / Path(url).name)
    return result


def hdri(asset: str) -> Path:
    """Ruta local del HDRI en .hdr."""
    SOURCES.add(asset)
    url = _fetch_json(asset)["hdri"][RESOLUTION]["hdr"]["url"]
    return _download(url, CACHE / asset / Path(url).name)

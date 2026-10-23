"""Lazy immutable-source thumbnail derivatives; never overwrite uploaded originals."""
import hashlib
import os
import tempfile
from PIL import Image, ImageOps
from flask import current_app
from app.utils.uploads import stored_file_path, uploads_root, upload_dir


def cache_path(stored):
    source = stored_file_path(stored)
    canonical = os.path.relpath(source, uploads_root())
    digest = hashlib.sha256(canonical.encode()).hexdigest()
    return os.path.join(uploads_root(), 'thumbnails', f'{digest}.jpg')


def thumbnail_file(stored):
    """Return <=320px JPEG derivative, reusing cache; source bytes stay untouched.

    Call only AFTER authorization. Exceptions allow the route to fall back to the
    authorized full-size image. Existing uploads need no destructive backfill.
    """
    source = stored_file_path(stored)
    target = cache_path(stored)
    if os.path.isfile(target) and os.stat(target).st_mtime_ns >= os.stat(source).st_mtime_ns:
        return target
    temporary = None
    try:
        with Image.open(source) as image:
            if image.width * image.height > 25_000_000:
                raise ValueError('Image too large for a thumbnail')
            image = ImageOps.exif_transpose(image)
            image.thumbnail((320, 320), Image.Resampling.LANCZOS)
            rgba = image.convert('RGBA')
            rgb = Image.new('RGB', rgba.size, 'white')
            rgb.paste(rgba, mask=rgba.getchannel('A'))
            fd, temporary = tempfile.mkstemp(suffix='.jpg', dir=upload_dir('thumbnails'))
            os.close(fd)
            rgb.save(temporary, 'JPEG', quality=75, optimize=True)
        os.replace(temporary, target)
        return target
    finally:
        if temporary and os.path.exists(temporary):
            os.remove(temporary)


def image_file(stored, thumbnail=False):
    if thumbnail:
        try:
            return thumbnail_file(stored)
        except (OSError, ValueError, Image.DecompressionBombError):
            current_app.logger.warning('Could not generate photo thumbnail; serving authorized full-size image')
    return stored_file_path(stored)


def remove_thumbnail(stored):
    try:
        os.remove(cache_path(stored))
    except (OSError, ValueError):
        pass

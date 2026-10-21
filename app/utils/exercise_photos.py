"""Validated session photo storage; uploads are attached directly, never staged."""
import io
import os
import uuid
import warnings

from PIL import Image, ImageOps, UnidentifiedImageError

from app.utils.uploads import upload_dir, stored_file_path


def save_exercise_photo(file):
    if not file or not file.filename:
        raise ValueError('No photo selected')
    extension = file.filename.rsplit('.', 1)[-1].lower()
    if extension not in ('jpg', 'jpeg', 'png', 'gif', 'webp'):
        raise ValueError('Photo must be JPEG, PNG, GIF or WebP')
    raw = file.read(10 * 1024 * 1024 + 1)
    if len(raw) > 10 * 1024 * 1024:
        raise ValueError('Photo must be at most 10 MB')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as image:
                if image.format not in ('JPEG', 'PNG', 'GIF', 'WEBP'):
                    raise ValueError('Unsupported image content')
                if image.width * image.height > 25_000_000:
                    raise ValueError('Photo dimensions are too large')
                image.load()
                normalized = ImageOps.exif_transpose(image).convert('RGB')
                normalized.thumbnail((2560, 2560))
                output = io.BytesIO()
                normalized.save(output, format='JPEG', quality=90)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ValueError('Invalid or oversized image') from None
    name = f'{uuid.uuid4().hex}.jpg'
    path = os.path.join(upload_dir('exercise_photos'), name)
    try:
        with open(path, 'xb') as target:
            target.write(output.getvalue())
    except Exception:
        if os.path.exists(path):
            os.remove(path)
        raise
    return f'exercise_photos/{name}'


def discard_new_photo(stored):
    if stored:
        try:
            os.remove(stored_file_path(stored))
        except FileNotFoundError:
            pass

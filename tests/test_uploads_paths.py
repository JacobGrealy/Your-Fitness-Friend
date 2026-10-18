"""Upload paths have one home and can be relocated (FF-0079).

The bug this prevents: verification runs against a copied database still wrote photos
into the real app/uploads tree, because five modules hard-coded that path. The isolation
was only half-wired, so a throwaway server could not actually be thrown away.
"""

import os
import subprocess
import sys

import pytest

from app.utils.uploads import stored_file_path, upload_dir, uploads_root


class TestUploadsRoot:
    def test_defaults_to_the_app_uploads_directory(self, app):
        with app.app_context():
            app.config.pop('UPLOAD_FOLDER', None)
            assert uploads_root().endswith(os.path.join('app', 'uploads'))

    def test_honours_upload_folder_from_config(self, app, tmp_path):
        with app.app_context():
            app.config['UPLOAD_FOLDER'] = str(tmp_path / 'elsewhere')
            assert uploads_root() == str((tmp_path / 'elsewhere').resolve())

    def test_upload_folder_is_environment_driven(self, tmp_path):
        """Config reads the env var, which is what lets a throwaway server stay isolated."""
        env = dict(os.environ, UPLOAD_FOLDER=str(tmp_path / 'isolated'))
        result = subprocess.run(
            [sys.executable, '-c', 'from app.config import Config; print(Config.UPLOAD_FOLDER)'],
            capture_output=True, text=True, env=env,
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        )
        assert result.returncode == 0, result.stderr
        assert result.stdout.strip() == str(tmp_path / 'isolated')


class TestUploadDir:
    def test_creates_the_subdirectory(self, app, tmp_path):
        with app.app_context():
            app.config['UPLOAD_FOLDER'] = str(tmp_path / 'uploads')
            path = upload_dir('weight_photos')
            assert os.path.isdir(path)
            assert path == str((tmp_path / 'uploads' / 'weight_photos').resolve())

    def test_is_idempotent(self, app, tmp_path):
        with app.app_context():
            app.config['UPLOAD_FOLDER'] = str(tmp_path / 'uploads')
            assert upload_dir('meal_photos') == upload_dir('meal_photos')


class TestStoredFilePath:
    def test_resolves_inside_the_uploads_root(self, app, tmp_path):
        with app.app_context():
            app.config['UPLOAD_FOLDER'] = str(tmp_path / 'uploads')
            resolved = stored_file_path('weight_photos/abc.jpg')
            assert resolved == str((tmp_path / 'uploads' / 'weight_photos' / 'abc.jpg').resolve())

    @pytest.mark.parametrize('escape', [
        '../instance/fitness_friend.db',
        'weight_photos/../../secret.txt',
        '/etc/passwd',
    ])
    def test_refuses_to_escape_the_root(self, app, tmp_path, escape):
        with app.app_context():
            app.config['UPLOAD_FOLDER'] = str(tmp_path / 'uploads')
            with pytest.raises(ValueError):
                stored_file_path(escape)

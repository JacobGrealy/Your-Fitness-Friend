import os
from datetime import timedelta


class Config:
    """Base configuration class."""
    
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///fitness_friend.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    # basic | strong — see app/__init__.py. Strong ties a session to the client
    # IP, which breaks mobile clients that switch networks.
    SESSION_PROTECTION = os.environ.get('SESSION_PROTECTION') or 'basic'
    # Only set true when the app is served exclusively over HTTPS; a Secure
    # cookie is silently dropped over plain HTTP, which looks like "login does
    # nothing" on the LAN address.
    SESSION_COOKIE_SECURE = (os.environ.get('SESSION_COOKIE_SECURE') or '').lower() in ('1', 'true', 'yes')
    
    # Qwen Configuration - llama-swap endpoint backing all AI features
    # (exercise calorie estimation, meal photo analysis, AI food logging)
    QWEN_BASE_URL = os.environ.get('QWEN_BASE_URL') or 'http://localhost:1234/v1'
    QWEN_MODEL = os.environ.get('QWEN_MODEL') or 'Qwen3.8-27B-UD-Q4_K_XL'
    QWEN_TEMPERATURE = os.environ.get('QWEN_TEMPERATURE')
    QWEN_MAX_TOKENS = int(os.environ.get('QWEN_MAX_TOKENS') or 50000)
    QWEN_TIMEOUT = 120  # seconds
    
    # Upload Configuration
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS = {
        'weights': {'png', 'jpg', 'jpeg', 'gif'},
        'foods': {'png', 'jpg', 'jpeg', 'gif'},
        'meal_photos': {'png', 'jpg', 'jpeg', 'gif'},
        'profile_photos': {'png', 'jpg', 'jpeg', 'gif', 'webp'},
        'food_log_photos': {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    }
    
    # CORS configuration: comma-separated list of browser origins allowed to
    # call the API cross-origin. The Vite dev server proxies /api server-side
    # and production serves the SPA from the same origin, so this only matters
    # when the frontend is hosted separately. Set CORS_ORIGINS in the
    # environment for LAN hosts rather than hardcoding IP addresses here.
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.environ.get(
            'CORS_ORIGINS',
            'http://localhost:5173,http://127.0.0.1:5173',
        ).split(',')
        if origin.strip()
    ]
    CORS_SUPPORTS_CREDENTIALS = True

    @staticmethod
    def allowed_file(filename, upload_type):
        """Check if file extension is allowed for specific upload type."""
        if '.' not in filename:
            return False
        extension = filename.rsplit('.', 1)[1].lower()
        allowed_extensions = Config.ALLOWED_EXTENSIONS.get(upload_type, set())
        return extension in allowed_extensions


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    
    # Logging configuration. INFO keeps the application's informational logs
    # visible in production; raise this via the LOG_LEVEL environment variable
    # if the volume becomes a problem.
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    # CORS: inherits the env-driven allowlist from Config. Deliberately not
    # defaulting to '*' here, which would let any site call the API on a
    # user's behalf.


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

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
    
    # LLM Configuration - Local llama.cpp server
    LLM_API_URL = os.environ.get('LLM_API_URL') or 'http://localhost:8080/v1'
    LLM_TIMEOUT = 120  # seconds - llama.cpp is slow
    
    # Qwen Configuration - Separate endpoint for exercise estimation
    QWEN_BASE_URL = os.environ.get('QWEN_BASE_URL') or 'http://localhost:8080/v1'
    QWEN_TIMEOUT = 120  # seconds
    
    # Upload Configuration
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS = {
        'weights': {'png', 'jpg', 'jpeg', 'gif'},
        'foods': {'png', 'jpg', 'jpeg', 'gif'},
        'meal_photos': {'png', 'jpg', 'jpeg', 'gif'}
    }
    
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
    
    # Logging configuration
    LOG_LEVEL = 'ERROR'
    
    # CORS configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    CORS_SUPPORTS_CREDENTIALS = False


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

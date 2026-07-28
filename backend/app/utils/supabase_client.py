"""
supabase_client.py - Supabase Integration

Why: Provides Supabase Storage and table query access (singleton pattern)

Class: SupabaseClient

Methods:
- init_app(app): Initialize with Flask app config
- client (property): Get Supabase client instance
- upload_file(bucket, file_path, file_data, content_type): Upload to Storage
- get_public_url(bucket, file_path): Get public file URL
- delete_file(bucket, file_path): Delete file from Storage
- query_table(table, select, filters): Query Supabase table directly

Function:
- init_supabase(app): Initialize global supabase_client

Usage: Mainly for file storage, direct table queries
"""

"""
Supabase client utility for PlanPal+
Provides easy access to Supabase features alongside Flask-SQLAlchemy
"""

import os
import logging
from supabase import create_client, Client
from typing import Optional

class SupabaseClient:
    """Singleton Supabase client for the application"""
    
    _instance: Optional['SupabaseClient'] = None
    _client: Optional[Client] = None
    _logger: Optional[logging.Logger] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def init_app(self, app):
        """Initialize Supabase client with Flask app config"""
        self._logger = app.logger
        
        try:
            supabase_url = app.config.get('SUPABASE_URL')
            supabase_key = app.config.get('SUPABASE_ANON_KEY')
            
            if not supabase_url or not supabase_key:
                self._logger.warning("Supabase URL or Key not provided. Some features may not work.")
                return None
            
            # Workaround for Render injecting HTTP_PROXY which breaks supabase-py initialization
            proxy_env = {}
            for k in ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY']:
                if k in os.environ:
                    proxy_env[k] = os.environ.pop(k)
                    
            self._client = create_client(supabase_url, supabase_key)
            
            # Restore proxy env vars
            for k, v in proxy_env.items():
                os.environ[k] = v
            
            app.supabase = self._client
            self._logger.info("Supabase client initialized successfully")
            return self._client
            
        except Exception as e:
            self._logger.error(f"Failed to initialize Supabase client: {str(e)}")
            return None
    
    @property
    def client(self) -> Optional[Client]:
        """Get the Supabase client instance"""
        return self._client
    
    def upload_file(self, bucket: str, file_path: str, file_data: bytes, content_type: str = None):
        """Upload file to Supabase Storage"""
        if not self._client:
            raise ValueError("Supabase client not initialized")
        
        try:
            result = self._client.storage.from_(bucket).upload(
                file_path, 
                file_data,
                {"content-type": content_type} if content_type else None
            )
            if self._logger:
                self._logger.info(f"File uploaded successfully: {file_path}")
            return result
        except Exception as e:
            if self._logger:
                self._logger.error(f"File upload failed: {str(e)}")
            raise
    
    def get_public_url(self, bucket: str, file_path: str):
        """Get public URL for a file in Supabase Storage"""
        if not self._client:
            raise ValueError("Supabase client not initialized")
        
        try:
            result = self._client.storage.from_(bucket).get_public_url(file_path)
            return result
        except Exception as e:
            if self._logger:
                self._logger.error(f"Failed to get public URL: {str(e)}")
            raise
    
    def delete_file(self, bucket: str, file_path: str):
        """Delete file from Supabase Storage"""
        if not self._client:
            raise ValueError("Supabase client not initialized")
        
        try:
            result = self._client.storage.from_(bucket).remove([file_path])
            if self._logger:
                self._logger.info(f"File deleted successfully: {file_path}")
            return result
        except Exception as e:
            if self._logger:
                self._logger.error(f"File deletion failed: {str(e)}")
            raise
    
    def query_table(self, table: str, select: str = "*", filters: dict = None):
        """Query a Supabase table"""
        if not self._client:
            raise ValueError("Supabase client not initialized")
        
        try:
            query = self._client.table(table).select(select)
            
            if filters:
                for key, value in filters.items():
                    query = query.eq(key, value)
            
            result = query.execute()
            return result.data
        except Exception as e:
            if self._logger:
                self._logger.error(f"Query failed: {str(e)}")
            raise

# Global instance
supabase_client = SupabaseClient()

def init_supabase(app):
    """Initialize Supabase with Flask app"""
    return supabase_client.init_app(app)
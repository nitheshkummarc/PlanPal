"""
Test script to validate Supabase migration
Run this after completing the migration to ensure everything works
"""

import os
import sys
import traceback
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Load environment variables from backend/.env
from dotenv import load_dotenv
backend_env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
load_dotenv(backend_env_path)

def test_database_connection():
    """Test basic database connectivity"""
    try:
        # Get database URL from environment
        db_url = os.getenv('SUPABASE_DATABASE_URL')
        if not db_url:
            print("❌ SUPABASE_DATABASE_URL not found in environment variables")
            return False
        
        # Test connection
        from sqlalchemy import create_engine, text
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ Database connected successfully")
            print(f"   PostgreSQL version: {version[:50]}...")
            return True
            
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False

def test_tables_exist():
    """Test that all required tables exist"""
    try:
        # Get database URL from environment
        db_url = os.getenv('SUPABASE_DATABASE_URL')
        if not db_url:
            print("❌ SUPABASE_DATABASE_URL not found in environment variables")
            return False
        
        expected_tables = [
            'users', 'events', 'participations', 'notifications',
            'user_matches', 'tags', 'user_tags', 'event_tags'
        ]
        
        from sqlalchemy import create_engine, text
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            for table in expected_tables:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.fetchone()[0]
                print(f"✅ Table '{table}' exists (contains {count} rows)")
            
            return True
            
    except Exception as e:
        print(f"❌ Table verification failed: {str(e)}")
        return False

def test_rls_policies():
    """Test that RLS policies are in place"""
    try:
        # Get database URL from environment
        db_url = os.getenv('SUPABASE_DATABASE_URL')
        if not db_url:
            print("❌ SUPABASE_DATABASE_URL not found in environment variables")
            return False
        
        from sqlalchemy import create_engine, text
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            # Check if RLS is enabled on users table
            result = conn.execute(text("""
                SELECT relname, relrowsecurity 
                FROM pg_class 
                WHERE relname IN ('users', 'events', 'notifications') 
                AND relrowsecurity = true
            """))
            
            rls_tables = result.fetchall()
            
            if len(rls_tables) >= 3:
                print(f"✅ RLS enabled on {len(rls_tables)} tables")
                return True
            else:
                print(f"⚠️  RLS might not be properly configured")
                return False
                
    except Exception as e:
        print(f"❌ RLS verification failed: {str(e)}")
        return False

def test_supabase_client():
    """Test Supabase client initialization"""
    try:
        # Check if environment variables are set
        required_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY']
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            print(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
            print("   Supabase client features will not work")
            return False
        
        # Try to import and test connection
        try:
            import supabase
            # Try multiple initialization methods to handle compatibility issues
            try:
                client = supabase.create_client(
                    os.getenv('SUPABASE_URL'), 
                    os.getenv('SUPABASE_ANON_KEY')
                )
            except TypeError as e:
                if 'proxy' in str(e):
                    print("⚠️  Proxy parameter compatibility issue detected, trying alternative...")
                    try:
                        # Try direct Client initialization
                        from supabase import Client
                        client = Client(
                            os.getenv('SUPABASE_URL'), 
                            os.getenv('SUPABASE_ANON_KEY')
                        )
                    except Exception as e2:
                        print(f"❌ Alternative client initialization failed: {str(e2)}")
                        return False
                else:
                    raise e
            
            print("✅ Supabase client initialized successfully")
            return True
        except ImportError:
            print("⚠️  Supabase package not installed. Run: pip install supabase")
            return False
            
    except Exception as e:
        print(f"❌ Supabase client test failed: {str(e)}")
        return False

def test_basic_crud():
    """Test basic CRUD operations"""
    try:
        # Get database URL from environment
        db_url = os.getenv('SUPABASE_DATABASE_URL')
        if not db_url:
            print("❌ SUPABASE_DATABASE_URL not found in environment variables")
            return False
        
        from sqlalchemy import create_engine, text
        import uuid
        
        engine = create_engine(db_url)
        
        test_tag_id = str(uuid.uuid4())
        test_tag_name = f"test_tag_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        with engine.connect() as conn:
            # Test INSERT
            conn.execute(text("""
                INSERT INTO tags (tag_id, name, description, color) 
                VALUES (:tag_id, :name, :description, :color)
            """), {
                'tag_id': test_tag_id,
                'name': test_tag_name,
                'description': 'Test tag for migration validation',
                'color': '#FF0000'
            })
            conn.commit()
            
            # Test SELECT
            result = conn.execute(text("""
                SELECT name FROM tags WHERE tag_id = :tag_id
            """), {'tag_id': test_tag_id})
            
            if result.fetchone():
                print("✅ Basic CRUD operations working")
                
                # Cleanup
                conn.execute(text("""
                    DELETE FROM tags WHERE tag_id = :tag_id
                """), {'tag_id': test_tag_id})
                conn.commit()
                
                return True
            else:
                print("❌ CRUD test failed - could not retrieve inserted data")
                return False
                
    except Exception as e:
        print(f"❌ CRUD test failed: {str(e)}")
        return False

def main():
    """Run all migration validation tests"""
    print("🧪 PlanPal+ Supabase Migration Validation")
    print("=" * 50)
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Tables Existence", test_tables_exist),
        ("RLS Policies", test_rls_policies),
        ("Supabase Client", test_supabase_client),
        ("Basic CRUD", test_basic_crud),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 Testing {test_name}...")
        try:
            if test_func():
                passed += 1
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            traceback.print_exc()
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 Migration validation successful! Your Supabase setup is ready.")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        print("💡 Make sure you:")
        print("   1. Created the Supabase project")
        print("   2. Ran the migration SQL scripts")
        print("   3. Set up environment variables")
        print("   4. Installed required packages")

if __name__ == "__main__":
    main()
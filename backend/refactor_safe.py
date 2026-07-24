import os
import re

files_to_modify = [
    r'backend\app\routes\auth.py',
    r'backend\app\routes\events.py',
    r'backend\app\routes\notifications.py',
    r'backend\app\routes\tags.py',
    r'backend\app\routes\users.py',
    r'backend\app\services\event_service.py',
    r'backend\app\utils\security.py',
    r'backend\tests\test_db_transactions.py'
]

def refactor_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find Model.query.get(id) -> \1 is Model, \2 is id
    pattern = re.compile(r'([A-Za-z0-9_]+)\.query\.get\((.*?)\)')
    
    if not pattern.search(content):
        return

    new_content = pattern.sub(r'db.session.get(\1, \2)', content)

    # Now handle imports.
    # Check if 'db' is already imported from 'app'
    has_db_import = re.search(r'from\s+app\s+import\s+.*?db\b', new_content)
    
    if not has_db_import:
        if 'security.py' in filepath:
            new_content = new_content.replace('from app.models import User', 'from app.models import User\nfrom app import db')
        else:
            print(f"WARNING: Need to manually add db import for {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

for filepath in files_to_modify:
    abs_path = os.path.join(os.getcwd(), filepath)
    if os.path.exists(abs_path):
        refactor_file(abs_path)
        print(f"Refactored {filepath}")
    else:
        print(f"Not found: {filepath}")

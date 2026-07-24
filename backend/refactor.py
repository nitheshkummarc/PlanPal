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

    # If 'from app import db' is missing and we are using db, we should add it.
    needs_db_import = False
    
    # regex to find Model.query.get(id)
    # \1 is Model, \2 is id
    pattern = re.compile(r'([A-Za-z0-9_]+)\.query\.get\((.*?)\)')
    
    if pattern.search(content):
        needs_db_import = True
        
    new_content = pattern.sub(r'db.session.get(\1, \2)', content)

    if needs_db_import and 'from app import db' not in new_content and 'from app import create_app, db' not in new_content:
        # insert it after other from app import
        import_pattern = re.compile(r'from app[^\n]*\n')
        match = import_pattern.search(new_content)
        if match:
            pos = match.end()
            new_content = new_content[:pos] + 'from app import db\n' + new_content[pos:]
        else:
            # just put it at top after docstring
            new_content = 'from app import db\n' + new_content

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

for filepath in files_to_modify:
    abs_path = os.path.join(os.getcwd(), filepath)
    if os.path.exists(abs_path):
        refactor_file(abs_path)
        print(f"Refactored {filepath}")
    else:
        print(f"Not found: {filepath}")


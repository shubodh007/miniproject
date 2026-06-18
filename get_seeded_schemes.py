import sys
sys.path.insert(0, './backend')
from app.core.database import get_supabase_client

client = get_supabase_client()
res = client.table("schemes").select("name, category, state").execute()
for item in res.data:
    print(f"- {item['name']} ({item['category']}, {item['state']})")

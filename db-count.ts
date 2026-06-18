import { execSync } from 'child_process';

console.log("Checking row counts in Supabase...");
try {
  const result = execSync('python3 -c "import sys; sys.path.insert(0, \'./backend\'); from app.core.database import get_supabase_client; client = get_supabase_client(); print(\'schemes:\', len(client.table(\'schemes\').select(\'id\').execute().data)); print(\'scheme_chunks:\', len(client.table(\'scheme_chunks\').select(\'id\').execute().data)); print(\'documents:\', len(client.table(\'documents\').select(\'id\').execute().data)); print(\'document_chunks:\', len(client.table(\'document_chunks\').select(\'id\').execute().data))"', {
    encoding: 'utf-8',
    env: { ...process.env, PYTHONPATH: './backend' }
  });
  console.log("Supabase counts:");
  console.log(result);
} catch (error: any) {
  console.log("Error querying Supabase:");
  console.log(error.stdout || "");
  console.log(error.stderr || "");
}

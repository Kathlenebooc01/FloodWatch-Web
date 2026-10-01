const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://xncciaozzxoqbesfxpww.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuY2NpYW96enhvcWJlc2Z4cHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDgyMzQsImV4cCI6MjA4NzkyNDIzNH0.im6QTwjVyryj4y0fvcloH4qw-Rj5PPftDYhk4sKtymI";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkFiles() {
  const buckets = ['incident-reports', 'reports'];
  for (const b of buckets) {
    const { data, error } = await supabase.storage.from(b).list();
    if (error) {
      console.log(`Error listing ${b}:`, error.message);
    } else {
      console.log(`Bucket ${b} files:`, data.map(f => f.name));
    }
  }
}
checkFiles();

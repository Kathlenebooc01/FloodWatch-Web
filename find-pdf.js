const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://xncciaozzxoqbesfxpww.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuY2NpYW96enhvcWJlc2Z4cHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDgyMzQsImV4cCI6MjA4NzkyNDIzNH0.im6QTwjVyryj4y0fvcloH4qw-Rj5PPftDYhk4sKtymI";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findPdf() {
  const buckets = ['incident-reports', 'reports'];
  let found = false;
  for (const b of buckets) {
    const { data, error } = await supabase.storage.from(b).list();
    if (data) {
      const pdf = data.find(f => f.name.includes('S1SY2627-course-crediting.pdf'));
      if (pdf) {
        console.log(`FOUND IN BUCKET: ${b}`);
        found = true;
      }
    }
  }
  if (!found) {
    console.log("PDF NOT FOUND IN ANY BUCKET.");
  }
}
findPdf();

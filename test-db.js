const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://xncciaozzxoqbesfxpww.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuY2NpYW96enhvcWJlc2Z4cHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDgyMzQsImV4cCI6MjA4NzkyNDIzNH0.im6QTwjVyryj4y0fvcloH4qw-Rj5PPftDYhk4sKtymI";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log("Testing connection...");
  const start = Date.now();
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  const end = Date.now();
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log(`Success! Query took ${end - start}ms`);
  }
}
testConnection();

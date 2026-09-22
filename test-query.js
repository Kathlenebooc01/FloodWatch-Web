const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://xncciaozzxoqbesfxpww.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuY2NpYW96enhvcWJlc2Z4cHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDgyMzQsImV4cCI6MjA4NzkyNDIzNH0.im6QTwjVyryj4y0fvcloH4qw-Rj5PPftDYhk4sKtymI');

async function test() {
  const { count, error } = await supabase
    .from('resource_requests')
    .select('*', { count: 'exact', head: true });
  console.log("Count:", count, "Error:", error);
}
test();

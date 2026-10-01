const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://xncciaozzxoqbesfxpww.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuY2NpYW96enhvcWJlc2Z4cHd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjM0ODIzNCwiZXhwIjoyMDg3OTI0MjM0fQ.MQRcV40PTwXPml9PqEeb9oLu6bwdkd5lI-IAhkfRDr8";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUpdate() {
  const { data, error } = await supabase
    .from('incident_report')
    .select('report_id, status, hazard_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log("Current rows:", data);
}
testUpdate();

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://xncciaozzxoqbesfxpww.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuY2NpYW96enhvcWJlc2Z4cHd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjM0ODIzNCwiZXhwIjoyMDg3OTI0MjM0fQ.MQRcV40PTwXPml9PqEeb9oLu6bwdkd5lI-IAhkfRDr8";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRel() {
  let { data, error } = await supabase
    .from('incident_report')
    .select('*, profiles!user_id(role)')
    .limit(1);
  if (error) {
    console.log("Error 1:", error.message);
    let { data: d2, error: e2 } = await supabase
      .from('incident_report')
      .select('*, profiles!incident_report_user_id_fkey(role)')
      .limit(1);
    console.log("Error 2:", e2 ? e2.message : "Success");
    console.log("Joined data 2:", d2);
  } else {
    console.log("Joined data 1:", data);
  }
}
checkRel();

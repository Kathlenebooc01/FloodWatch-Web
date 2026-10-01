const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://xncciaozzxoqbesfxpww.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuY2NpYW96enhvcWJlc2Z4cHd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjM0ODIzNCwiZXhwIjoyMDg3OTI0MjM0fQ.MQRcV40PTwXPml9PqEeb9oLu6bwdkd5lI-IAhkfRDr8";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testHead() {
  const { data, count, error } = await supabase
        .from("incident_report")
        .select("report_id, profiles!user_id!inner(role)", { count: "exact", head: true })
        .neq("profiles.role", "citizen")
        .in("status", ["Ready_For_LGU", "Ready_for_LGU", "ready_for_lgu", "Pending_AI", "pending_ai", "Pending", "pending"]);
  console.log("Error:", error ? error.message : "Success");
  console.log("Count:", count);
}
testHead();

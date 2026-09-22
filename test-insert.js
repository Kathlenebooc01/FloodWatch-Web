const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://xncciaozzxoqbesfxpww.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuY2NpYW96enhvcWJlc2Z4cHd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjM0ODIzNCwiZXhwIjoyMDg3OTI0MjM0fQ.MQRcV40PTwXPml9PqEeb9oLu6bwdkd5lI-IAhkfRDr8');

async function run() {
  const { data: request } = await supabase.from('resource_requests').select('request_id').limit(1).single();
  const { data: item } = await supabase.from('resource_request_items').select('utilities_id').limit(1).single();

  const statuses = ['Pending', 'pending', 'Batch 1', 'Pending_Dispatch', 'In_Transit', 'Allocated', 'Fully_Allocated', 'Partially_Allocated', null];
  
  for (const status of statuses) {
    const alloc = {
        request_id: request?.request_id || '00000000-0000-0000-0000-000000000000',
        utilities_id: item?.utilities_id || '00000000-0000-0000-0000-000000000000',
        quantity_allocated: 10,
        batch: status,
        expected_return_date: new Date().toISOString(),
        approved_by: '00000000-0000-0000-0000-000000000000'
    };

    const { error } = await supabase.from('resource_allocations').insert([alloc]);
    if (error) {
      console.log(`Failed with batch="${status}": ${error.message}`);
    } else {
      console.log(`SUCCESS with batch="${status}"!`);
      break;
    }
  }
}

run();

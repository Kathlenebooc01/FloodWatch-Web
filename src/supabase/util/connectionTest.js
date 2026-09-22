'use client';
import { useEffect } from 'react';
import { supabase } from '@/supabase/util/supabase'; // Make sure this points to your bridge file

export default function ConnectionTest() {
  // This runs once when the component first loads on the screen
  useEffect(() => {
    const testConnection = async () => {
      console.log('📡 Initiating Supabase connection test...');

      try {
        // Try to fetch 1 row from your table
        const { data, error } = await supabase
          .from('api_monitoring')
          .select('*')
          .limit(1);

        if (error) {
          console.error('❌ Connection Failed! Error details:', error.message);
        } else {
          console.log('✅ Connection Successful! The bridge is open.');
          console.log('📦 Data received:', data);
        }
      } catch (err) {
        console.error('💥 Unexpected Crash:', err);
      }
    };

    testConnection();
  }, []);

  // 🚨 The loud siren: If you don't see this in the console, Next.js isn't rendering the file
  console.log("🚨 REACT IS AWAKE AND RENDERING!");

  return (
    <div className="p-4 mt-4 bg-gray-900 text-green-400 font-mono text-xs rounded shadow-lg w-fit border border-gray-700">
      <p className="font-bold mb-1">Status: Connection Test Active</p>
      <p className="text-gray-400">Right-click &rarr; Inspect &rarr; Console</p>
    </div>
  );
}
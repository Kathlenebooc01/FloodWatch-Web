import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // Removed the TypeScript '!' assertions
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_SERVICE_ROLE_KEY 
  );

  // Read the geojson file from the filesystem
  const filePath = path.join(process.cwd(), 'src/components/data/CEBU.geojson');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const cebuBoundaries = JSON.parse(fileContents);

  let successCount = 0;
  let errorCount = 0;
  let errorDetails = [];

  for (const feature of cebuBoundaries.features) {
    // These variables match your specific file perfectly!
    const cityName = feature.properties.MUNICIPALI; 
    const psgcCode = feature.properties.GEOCODE; 
    const shapeData = feature.geometry; 

    // Send to your Supabase RPC function
    const { error } = await supabase.rpc('insert_cebu_municipality', {
      p_name: cityName,
      p_geojson: shapeData
    });

    if (error) {
      console.error(`Failed to insert ${cityName}:`, error.message);
      if (errorDetails.length < 5) errorDetails.push(`${cityName}: ${error.message}`);
      errorCount++;
    } else {
      successCount++;
    }
  }

  return NextResponse.json({ 
    message: "Seeding Complete", 
    successes: successCount, 
    errors: errorCount,
    errorDetails
  });
}
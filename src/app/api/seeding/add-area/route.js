import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Helper: Generate a bounding box polygon (WKT) around a center point
function generateDefaultGeofenceWkt(lng, lat, delta = 0.04) {
  const minLng = (lng - delta).toFixed(6);
  const maxLng = (lng + delta).toFixed(6);
  const minLat = (lat - delta).toFixed(6);
  const maxLat = (lat + delta).toFixed(6);
  return `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      province_id, 
      new_province_name, 
      is_new_province, 
      name, 
      latitude, 
      longitude, 
      center_point, 
      boundary_geofence 
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Municipality or City name is required.' },
        { status: 400 }
      );
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid numeric coordinates provided.' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_SERVICE_ROLE_KEY
    );

    let targetProvinceId = province_id;

    // Handle creating a new province if requested
    if (is_new_province || !targetProvinceId) {
      if (!new_province_name || !new_province_name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Province name is required.' },
          { status: 400 }
        );
      }

      const { data: newProv, error: provErr } = await supabase
        .from('province')
        .insert({ name: new_province_name.trim() })
        .select('province_id')
        .single();

      if (provErr) throw provErr;
      targetProvinceId = newProv.province_id;
    }

    // Format Center Point WKT (PostGIS geography format: POINT(lng lat))
    const formattedCenterPoint = (center_point && center_point.trim().startsWith('POINT'))
      ? center_point.trim()
      : `POINT(${lngNum.toFixed(6)} ${latNum.toFixed(6)})`;

    // Format Boundary Geofence WKT (PostGIS geography format: POLYGON((...)))
    const formattedBoundary = (boundary_geofence && boundary_geofence.trim().startsWith('POLYGON'))
      ? boundary_geofence.trim()
      : generateDefaultGeofenceWkt(lngNum, latNum);

    const now = new Date().toISOString();

    const insertPayload = {
      province_id: targetProvinceId,
      name: name.trim(),
      center_latitude: latNum,
      center_longitude: lngNum,
      center_point: formattedCenterPoint,
      boundary_geofence: formattedBoundary,
      added_on: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('municipality_or_city')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      // If geography type requires raw fallback, attempt standard insert
      console.warn("Insert with geography columns error, attempting fallback:", error.message);
      const fallbackPayload = {
        province_id: targetProvinceId,
        name: name.trim(),
        center_latitude: latNum,
        center_longitude: lngNum,
        added_on: now,
        updated_at: now
      };
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('municipality_or_city')
        .insert(fallbackPayload)
        .select()
        .single();

      if (fallbackErr) throw fallbackErr;
      return NextResponse.json({ success: true, message: 'Area added successfully.', data: fallbackData });
    }

    return NextResponse.json({ success: true, message: 'Area added successfully with PostGIS geofence.', data });
  } catch (err) {
    console.error("API add-area error:", err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to add area record.' },
      { status: 500 }
    );
  }
}

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
    const { municipality_id, name, latitude, longitude, center_point, boundary_geofence } = body;

    if (!municipality_id) {
      return NextResponse.json(
        { success: false, error: 'Missing municipality_id.' },
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

    const formattedCenterPoint = (center_point && center_point.trim().startsWith('POINT'))
      ? center_point.trim()
      : `POINT(${lngNum.toFixed(6)} ${latNum.toFixed(6)})`;

    const formattedBoundary = (boundary_geofence && boundary_geofence.trim().startsWith('POLYGON'))
      ? boundary_geofence.trim()
      : generateDefaultGeofenceWkt(lngNum, latNum);

    const updatePayload = {
      center_latitude: latNum,
      center_longitude: lngNum,
      center_point: formattedCenterPoint,
      boundary_geofence: formattedBoundary,
      updated_at: new Date().toISOString()
    };

    if (name && name.trim()) {
      updatePayload.name = name.trim();
    }

    const { data, error } = await supabase
      .from('municipality_or_city')
      .update(updatePayload)
      .eq('municipality_id', municipality_id)
      .select();

    if (error) {
      console.warn("Update with geography columns error, attempting fallback:", error.message);
      const fallbackPayload = {
        center_latitude: latNum,
        center_longitude: lngNum,
        updated_at: new Date().toISOString()
      };
      if (name && name.trim()) fallbackPayload.name = name.trim();

      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('municipality_or_city')
        .update(fallbackPayload)
        .eq('municipality_id', municipality_id)
        .select();

      if (fallbackErr) throw fallbackErr;
      return NextResponse.json({ success: true, message: 'Area updated successfully.', data: fallbackData });
    }

    return NextResponse.json({ success: true, message: 'Area updated successfully with PostGIS geofence.', data });
  } catch (err) {
    console.error("API update-area error:", err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update area record.' },
      { status: 500 }
    );
  }
}

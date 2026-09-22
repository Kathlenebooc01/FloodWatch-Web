import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json()
    const { municipality_id, province_id } = body

    if (!municipality_id && !province_id) {
      return NextResponse.json(
        { success: false, error: 'Missing municipality_id or province_id for deletion.' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_SERVICE_ROLE_KEY
    )

    if (municipality_id) {
      // 1. Remove non-blocking child telemetry records if present
      await supabase.from('weather_telemetry').delete().eq('municipality_id', municipality_id)
      await supabase.from('air_quality').delete().eq('municipality_id', municipality_id)

      // 2. Delete the municipality from municipality_or_city
      const { error } = await supabase
        .from('municipality_or_city')
        .delete()
        .eq('municipality_id', municipality_id)

      if (error) {
        throw error
      }

      return NextResponse.json({ success: true, message: 'Municipality deleted successfully.' })
    } else if (province_id) {
      // Delete province record
      const { error } = await supabase
        .from('province')
        .delete()
        .eq('province_id', province_id)

      if (error) {
        throw error
      }

      return NextResponse.json({ success: true, message: 'Province deleted successfully.' })
    }
  } catch (err) {
    console.error("API delete-area error:", err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete area record.' },
      { status: 500 }
    )
  }
}

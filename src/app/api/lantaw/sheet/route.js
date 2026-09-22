import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.NEXT_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Allowed source tables — must match LantawSources exactly
const ALLOWED_SOURCES = {
    pdrrmo_inventory:   { table: 'pdrrmo_inventory',   order: null },
    weather_telemetry:  { table: 'weather_telemetry',  order: { col: 'fetched_at', ascending: false } },
    incident_report:    { table: 'incident_report',    order: { col: 'created_at', ascending: false } },
    air_quality:        { table: 'air_quality',        order: { col: 'recorded_at', ascending: false } },
    distress_signals:   { table: 'distress_signals',   order: { col: 'created_at', ascending: false } },
    utilities:          { table: 'utilities',          order: null },
}

// Prettify column header: snake_case → Title Case
function prettifyHeader(key) {
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
}

export async function POST(request) {
    try {
        const { source, title } = await request.json()

        if (!source || !ALLOWED_SOURCES[source]) {
            return NextResponse.json(
                { error: `Invalid source. Allowed: ${Object.keys(ALLOWED_SOURCES).join(', ')}` },
                { status: 400 }
            )
        }

        const config = ALLOWED_SOURCES[source]

        // Fetch real data directly from Supabase (LantawSources)
        let query = supabaseAdmin.from(config.table).select('*')
        if (config.order) {
            query = query.order(config.order.col, { ascending: config.order.ascending })
        }
        query = query.limit(500)

        const { data, error } = await query

        if (error) throw error

        if (!data || data.length === 0) {
            return NextResponse.json({ error: "No data found for this source." }, { status: 404 })
        }

        // Build the Excel workbook
        const workbook = new ExcelJS.Workbook()
        workbook.creator = 'Lantaw AI — FloodWatch Platform'
        workbook.created = new Date()

        const sheetName = (title || prettifyHeader(source)).substring(0, 31)
        const worksheet = workbook.addWorksheet(sheetName)

        // Extract column headers from first row
        const columns = Object.keys(data[0])
        worksheet.columns = columns.map(col => ({
            header: prettifyHeader(col),
            key: col,
            width: Math.max(prettifyHeader(col).length + 4, 15),
        }))

        // Style the header row
        const headerRow = worksheet.getRow(1)
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E40AF' }, // Blue
        }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
        headerRow.height = 28

        // Add data rows
        data.forEach((row, index) => {
            const dataRow = worksheet.addRow(row)
            dataRow.font = { size: 10 }
            // Alternate row color
            if (index % 2 === 0) {
                dataRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF1F5F9' }, // Light gray
                }
            }
        })

        // Auto-filter on headers
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: columns.length },
        }

        // Freeze the header row
        worksheet.views = [{ state: 'frozen', ySplit: 1 }]

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer()

        const safeTitle = (title || source).replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_').substring(0, 60)
        const fileName = `${safeTitle}_FloodWatch.xlsx`

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            }
        })
    } catch (err) {
        console.error("Sheet generation error:", err)
        return NextResponse.json({ error: "Failed to generate spreadsheet." }, { status: 500 })
    }
}

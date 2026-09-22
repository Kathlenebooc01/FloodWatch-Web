import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractSpreadsheet, extractPlainText, extractMultimodal } from '@/lib/lantaw/extractors';
import { cleanseAndFilterItems } from '@/lib/lantaw/cleanser';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.NEXT_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

const SPREADSHEET_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_EXTENSIONS = [...SPREADSHEET_EXTENSIONS, ...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const targetTable = formData.get('target_table') || 'utilities';

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const fileName = file.name || 'uploaded_file';
    const ext = fileName.includes('.') ? `.${fileName.split('.').pop().toLowerCase()}` : '';

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({
        error: `Unsupported file type '${ext}'. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({
        error: `File size exceeds limit (${formatBytes(buffer.length)}). Maximum allowed is 10 MB.`
      }, { status: 400 });
    }

    // ── 1. Route to Native Extractor ─────────────────────────────────────────
    let extractionResult;
    let fileType = 'document';

    if (SPREADSHEET_EXTENSIONS.includes(ext)) {
      fileType = 'document';
      extractionResult = await extractSpreadsheet(buffer, ext);
    } else if (ext === '.txt') {
      fileType = 'document';
      extractionResult = await extractPlainText(buffer);
    } else if (ext === '.pdf' || ext === '.docx') {
      fileType = 'document';
      const mime = ext === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      extractionResult = await extractMultimodal(buffer, mime);
    } else if (IMAGE_EXTENSIONS.includes(ext)) {
      fileType = 'image';
      const mimeMap = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
      };
      extractionResult = await extractMultimodal(buffer, mimeMap[ext] || file.type || 'image/png');
    } else {
      return NextResponse.json({ error: `Unsupported format '${ext}'` }, { status: 400 });
    }

    if (extractionResult.error) {
      return NextResponse.json({ error: extractionResult.error }, { status: 400 });
    }

    const rawItems = extractionResult.items || [];

    // ── 2. Cleanse, Deduplicate, and Filter Items ───────────────────────────
    const cleansingResult = await cleanseAndFilterItems(rawItems, targetTable, supabaseAdmin);

    const metadata = {
      file_name: fileName,
      extension: ext,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: buffer.length,
      size_readable: formatBytes(buffer.length),
    };

    // ── 3. Return JSON in exact format consumed by frontend ─────────────────
    return NextResponse.json({
      data: {
        success: true,
        file_type: fileType,
        metadata: metadata,
        data: {
          extracted_items: cleansingResult.cleaned_items,
          cleansing_insight: cleansingResult.cleansing_insight,
        },
        error: null,
      }
    });

  } catch (err) {
    console.error("Lantaw Extract API Error:", err);
    return NextResponse.json({
      error: err.message || "An internal error occurred during extraction."
    }, { status: 500 });
  }
}

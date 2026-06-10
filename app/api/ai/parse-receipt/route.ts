import { NextRequest, NextResponse } from 'next/server';
import { parseReceiptImage } from '@/lib/ai/ai';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Opt out of caching since this processes uploaded files
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Secure the route (Only authenticated users can use the AI to prevent abuse)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('receipt') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    // 3. Validate file type (limit to images)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are supported.' }, { status: 400 });
    }

    // 4. Convert File to Base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type;

    // 5. Invoke Gemini AI Vision
    const result = await parseReceiptImage(base64Image, mimeType);

    // 6. Return the parsed structured JSON
    return NextResponse.json({ success: true, data: result });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to parse receipt image. Please try again.';
    console.error('Error parsing receipt:', error);
    return NextResponse.json(
      { error: message }, 
      { status: 500 }
    );
  }
}

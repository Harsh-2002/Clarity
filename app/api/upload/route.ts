import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { nanoid } from 'nanoid';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/api/middleware/nextjs-auth';

// Upload directory
const UPLOAD_DIR = join(process.cwd(), 'data', 'uploads');

// Ensure upload directory exists
async function ensureUploadDir() {
    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }
}

// POST /api/upload - Upload a file
export async function POST(req: NextRequest) {
    const userId = await verifyAuth(req);
    if (!userId) return unauthorized();

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return badRequest('No file provided');
        }

        // Validate file type (images only for now)
        if (!file.type.startsWith('image/')) {
            return badRequest('Only image files are allowed');
        }

        // Validate file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
            return badRequest('File too large (max 20MB)');
        }

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'png';
        const filename = `${nanoid()}.${ext}`;

        // Ensure directory exists
        await ensureUploadDir();

        // Save file
        const buffer = Buffer.from(await file.arrayBuffer());
        const filepath = join(UPLOAD_DIR, filename);
        await writeFile(filepath, buffer);

        // Return the public URL
        const publicUrl = `/uploads/${filename}`;

        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        console.error('Upload failed:', error);
        return serverError('Failed to upload file');
    }
}

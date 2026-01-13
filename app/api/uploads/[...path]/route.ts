import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Upload directory
const UPLOAD_DIR = join(process.cwd(), 'data', 'uploads');

// Mime types
const MIME_TYPES: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
};

// GET /api/uploads/[...path] - Serve uploaded files
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const filename = path.join('/');
        const filepath = join(UPLOAD_DIR, filename);

        // Security: prevent directory traversal
        if (!filepath.startsWith(UPLOAD_DIR)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (!existsSync(filepath)) {
            return new NextResponse('Not Found', { status: 404 });
        }

        const buffer = await readFile(filepath);
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Failed to serve file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

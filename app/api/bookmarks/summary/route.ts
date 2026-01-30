import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/api/db/client';
import { bookmarks } from '@/lib/api/db/schema';
import { verifyAuth, unauthorized } from '@/lib/api/middleware/nextjs-auth';

// GET - Get bookmarks summary (count)
export async function GET(req: NextRequest) {
    // Auth check
    const userId = await verifyAuth(req);
    if (!userId) {
        return unauthorized();
    }

    // CORS headers for extension
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    };

    try {
        const allBookmarks = await db.select().from(bookmarks);
        const count = allBookmarks.length;

        return NextResponse.json({ count }, { headers });
    } catch (error) {
        console.error('Failed to fetch bookmark count:', error);
        return NextResponse.json({ error: 'Failed to fetch bookmark count' }, { status: 500, headers });
    }
}

// OPTIONS - Handle CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
    });
}

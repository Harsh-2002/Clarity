import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { nanoid } from 'nanoid';
import { db } from '@/lib/api/db/client';
import { bookmarks } from '@/lib/api/db/schema';
import { eq, desc } from 'drizzle-orm';

// Fetch Open Graph metadata from a URL
async function fetchMetadata(url: string) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ClarityBot/1.0)',
            },
            signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!res.ok) {
            return { title: url, description: null, image: null, favicon: null };
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        // Extract metadata
        const title =
            $('meta[property="og:title"]').attr('content') ||
            $('meta[name="twitter:title"]').attr('content') ||
            $('title').text() ||
            url;

        const description =
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="twitter:description"]').attr('content') ||
            $('meta[name="description"]').attr('content') ||
            null;

        let image =
            $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content') ||
            null;

        // Make relative URLs absolute
        if (image && !image.startsWith('http')) {
            const baseUrl = new URL(url);
            image = new URL(image, baseUrl.origin).href;
        }

        // Get favicon
        let favicon =
            $('link[rel="icon"]').attr('href') ||
            $('link[rel="shortcut icon"]').attr('href') ||
            null;

        // Fallback to Google Favicon service
        if (!favicon) {
            const domain = new URL(url).hostname;
            favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } else if (!favicon.startsWith('http')) {
            const baseUrl = new URL(url);
            favicon = new URL(favicon, baseUrl.origin).href;
        }

        return { title, description, image, favicon };
    } catch (error) {
        console.error('Failed to fetch metadata:', error);
        const domain = new URL(url).hostname;
        return {
            title: url,
            description: null,
            image: null,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        };
    }
}

// GET - List all bookmarks
export async function GET() {
    try {
        const allBookmarks = await db
            .select()
            .from(bookmarks)
            .orderBy(desc(bookmarks.createdAt));

        return NextResponse.json(allBookmarks);
    } catch (error) {
        console.error('Failed to fetch bookmarks:', error);
        return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }
}

// POST - Create a new bookmark
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Validate URL format
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }

        // Check if bookmark already exists
        const existing = await db
            .select()
            .from(bookmarks)
            .where(eq(bookmarks.url, parsedUrl.href))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json({ error: 'Bookmark already exists', bookmark: existing[0] }, { status: 409 });
        }

        // Fetch metadata
        const metadata = await fetchMetadata(parsedUrl.href);

        // Create bookmark
        const now = new Date();
        const newBookmark = {
            id: nanoid(),
            url: parsedUrl.href,
            title: metadata.title,
            description: metadata.description,
            image: metadata.image,
            favicon: metadata.favicon,
            tags: null,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(bookmarks).values(newBookmark);

        return NextResponse.json(newBookmark, { status: 201 });
    } catch (error) {
        console.error('Failed to create bookmark:', error);
        return NextResponse.json({ error: 'Failed to create bookmark' }, { status: 500 });
    }
}

// DELETE - Remove a bookmark
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await db.delete(bookmarks).where(eq(bookmarks.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete bookmark:', error);
        return NextResponse.json({ error: 'Failed to delete bookmark' }, { status: 500 });
    }
}

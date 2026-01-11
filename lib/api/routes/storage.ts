import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { z } from 'zod';
import { createReadStream, createWriteStream, statSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { nanoid } from 'nanoid';
import { authMiddleware } from '../middleware/auth';

const storageRoutes = new Hono();
const UPLOAD_DIR = './data/uploads';

// Helper to get date-based path
function getDatePath() {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return { year, month, relativePath: join(year, month) };
}

// Upload endpoint
storageRoutes.post('/upload', authMiddleware, async (c) => {
    try {
        const body = await c.req.parseBody();
        const file = body['file'];

        if (!file || typeof file === 'string') {
            return c.json({ error: 'No file uploaded' }, 400);
        }

        const { year, month, relativePath } = getDatePath();
        // ID Format: YYYYMM_nanoid (Simple prefix for folder resolution)
        const id = `${year}${month}_${nanoid()}`;

        const fullDir = join(UPLOAD_DIR, relativePath);

        // Ensure year/month directory exists
        if (!existsSync(fullDir)) {
            mkdirSync(fullDir, { recursive: true });
        }

        const fileName = `${id}.webm`;
        const filePath = join(fullDir, fileName);

        const buffer = await file.arrayBuffer();

        // Write file to disk
        await new Promise<void>((resolve, reject) => {
            const writeStream = createWriteStream(filePath);
            writeStream.write(Buffer.from(buffer));
            writeStream.end();
            writeStream.on('finish', () => resolve());
            writeStream.on('error', reject);
        });

        // Return URL with the ID (frontend keeps this URL)
        // Note: frontend consumes this URL but might also construct its own from ID.
        // Keeping path as /files/:id ensures compatibility if frontend uses ID.
        return c.json({
            id,
            url: `/api/v1/storage/files/${id}`,
            size: buffer.byteLength,
            mimeType: file.type
        });
    } catch (error) {
        console.error('Upload failed:', error);
        return c.json({ error: 'Upload failed' }, 500);
    }
});

// Stream endpoint with Range support
storageRoutes.get('/files/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');

    // Determine path based on ID format (YYYYMM_...)
    let filePath: string;
    if (id.length > 7 && id[6] === '_') {
        const year = id.substring(0, 4);
        const month = id.substring(4, 6);
        filePath = join(UPLOAD_DIR, year, month, `${id}.webm`);
    } else {
        // Legacy or plain ID (look in root)
        filePath = join(UPLOAD_DIR, `${id}.webm`);
    }

    if (!existsSync(filePath)) {
        return c.json({ error: 'File not found' }, 404);
    }

    const stat = statSync(filePath);
    const fileSize = stat.size;
    const range = c.req.header('range');

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        c.status(206);
        c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        c.header('Accept-Ranges', 'bytes');
        c.header('Content-Length', chunksize.toString());
        c.header('Content-Type', 'audio/webm');

        return stream(c, async (stream) => {
            const fileStream = createReadStream(filePath, { start, end });
            for await (const chunk of fileStream) {
                await stream.write(chunk);
            }
        });
    }
});

// Delete endpoint
storageRoutes.delete('/files/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');

    // Determine path based on ID format (YYYYMM_...)
    let filePath: string;
    if (id.length > 7 && id[6] === '_') {
        const year = id.substring(0, 4);
        const month = id.substring(4, 6);
        filePath = join(UPLOAD_DIR, year, month, `${id}.webm`);
    } else {
        // Legacy or plain ID
        filePath = join(UPLOAD_DIR, `${id}.webm`);
    }

    if (!existsSync(filePath)) {
        return c.json({ error: 'File not found' }, 404);
    }

    try {
        const { unlinkSync } = await import('fs');
        unlinkSync(filePath);
        return c.json({ success: true });
    } catch (error) {
        console.error('Delete failed:', error);
        return c.json({ error: 'Delete failed' }, 500);
    }
});

export default storageRoutes;

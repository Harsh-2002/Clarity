import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { providers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../lib/encryption';
import { authMiddleware } from '../middleware/auth';

const aiRoutes = new Hono();

// Schemas
const modelRequestSchema = z.object({
    providerId: z.string(),
});

const validateRequestSchema = z.object({
    providerId: z.string(),
    apiKey: z.string(),
});

// Helper to fetch models from provider
async function fetchProviderModels(provider: string, apiKey: string) {
    if (provider === 'openai') {
        const res = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error("Failed to fetch models from OpenAI");
        const data = await res.json();
        return data.data
            .filter((m: any) =>
                m.id.includes("gpt") ||
                m.id.includes("whisper") ||
                m.id.includes("text-davinci")
            )
            .map((m: any) => m.id)
            .sort();
    }

    if (provider === 'groq') {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error("Failed to fetch models from Groq");
        const data = await res.json();
        return data.data.map((m: any) => m.id).sort();
    }

    if (provider === 'assemblyai') {
        return ["best", "default", "nano"];
    }

    return [];
}

// 1. Fetch available models (Uses stored key OR provided key)
aiRoutes.post('/models', authMiddleware, async (c) => {
    try {
        const body = await c.req.json();

        // Allow optional apiKey for onboarding checks
        const schema = z.object({
            providerId: z.string(),
            apiKey: z.string().optional(),
        });

        const { providerId, apiKey: providedKey } = schema.parse(body);

        let finalApiKey = providedKey;

        // If no key provided, look up in DB
        if (!finalApiKey) {
            const provider = await db.query.providers.findFirst({
                where: eq(providers.id, providerId),
            });

            if (!provider) return c.json({ error: 'Provider not found' }, 404);

            try {
                finalApiKey = decrypt(provider.encryptedApiKey);
            } catch {
                return c.json({ error: 'Failed to decrypt API key' }, 500);
            }
        }

        if (!finalApiKey) {
            return c.json({ error: 'API Key required' }, 400);
        }

        const models = await fetchProviderModels(providerId, finalApiKey);
        return c.json({ models });

    } catch (error) {
        console.error('AI Proxy Error:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Failed to fetch models' }, 500);
    }
});

// 2. Validate API Key (Uses provided key)
aiRoutes.post('/validate', authMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const { providerId, apiKey } = validateRequestSchema.parse(body);

        let valid = false;

        if (providerId === 'openai') {
            const res = await fetch("https://api.openai.com/v1/models", {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            valid = res.ok;
        } else if (providerId === 'groq') {
            const res = await fetch("https://api.groq.com/openai/v1/models", {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            valid = res.ok;
        } else if (providerId === 'assemblyai') {
            const res = await fetch("https://api.assemblyai.com/v2/account", {
                headers: { Authorization: apiKey },
            });
            valid = res.ok;
        }

        return c.json({ valid });
    } catch (error) {
        return c.json({ valid: false, error: 'Validation failed' });
    }
});

// 3. Transcribe Audio (Proxy)
aiRoutes.post('/transcribe', authMiddleware, async (c) => {
    try {
        const body = await c.req.parseBody();
        const file = body['file'];
        const providerId = body['providerId'] as string;
        const model = body['model'] as string;

        if (!file || !(file instanceof File)) {
            return c.json({ error: 'No audio file provided' }, 400);
        }

        if (!providerId || !model) {
            return c.json({ error: 'Missing providerId or model' }, 400);
        }

        // Get Provider Key
        const provider = await db.query.providers.findFirst({
            where: eq(providers.id, providerId),
        });

        if (!provider) return c.json({ error: 'Provider not found' }, 404);

        let finalApiKey = "";
        try {
            finalApiKey = decrypt(provider.encryptedApiKey);
        } catch {
            return c.json({ error: 'Failed to decrypt API key' }, 500);
        }

        // Proxy to Provider
        if (providerId === 'openai') {
            const formData = new FormData();
            formData.append('file', file, 'audio.webm');
            formData.append('model', model);

            const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: { Authorization: `Bearer ${finalApiKey}` },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error("OpenAI Error:", err);
                return c.json({ error: err.error?.message || "OpenAI failed" }, res.status as any);
            }
            const data = await res.json();
            return c.json({ text: data.text });
        }

        if (providerId === 'groq') {
            const formData = new FormData();
            formData.append('file', file, 'audio.webm');
            formData.append('model', model);

            const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
                method: "POST",
                headers: { Authorization: `Bearer ${finalApiKey}` },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error("Groq Error:", err);
                return c.json({ error: err.error?.message || "Groq failed" }, res.status as any);
            }
            const data = await res.json();
            return c.json({ text: data.text });
        }

        return c.json({ error: 'Provider not supported for proxy' }, 400);

    } catch (error) {
        console.error('Transcription Proxy Error:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Transformation failed' }, 500);
    }
});

// 4. Fine-tune / Refine Text (Proxy)
aiRoutes.post('/finetune', authMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const { providerId, model, text, systemPrompt } = body;

        if (!text || !providerId || !model) {
            return c.json({ error: 'Missing required fields' }, 400);
        }

        const provider = await db.query.providers.findFirst({
            where: eq(providers.id, providerId),
        });

        if (!provider) return c.json({ error: 'Provider not found' }, 404);

        let finalApiKey = "";
        try {
            finalApiKey = decrypt(provider.encryptedApiKey);
        } catch {
            return c.json({ error: 'Failed to decrypt API key' }, 500);
        }

        const messages = [
            {
                role: "system",
                content: systemPrompt || "You are an expert transcription editor. Improve the provided transcription text for clarity, grammar, and coherence. After the improved text, on a new line, add relevant tags in the format: TAGS: tag1, tag2, tag3."
            },
            {
                role: "user",
                content: `Please improve this transcription and suggest relevant tags:\n\n${text}`
            }
        ];

        let apiUrl = "";
        if (providerId === 'openai') {
            apiUrl = "https://api.openai.com/v1/chat/completions";
        } else if (providerId === 'groq') {
            apiUrl = "https://api.groq.com/openai/v1/chat/completions";
        } else {
            return c.json({ error: 'Provider not supported for fine-tuning' }, 400);
        }

        const res = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${finalApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.3
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error("Finetune Proxy Error:", err);
            return c.json({ error: err.error?.message || "AI request failed" }, res.status as any);
        }

        const data = await res.json();
        const finetunedText = data.choices?.[0]?.message?.content || "";

        return c.json({ text: finetunedText });

    } catch (error) {
        console.error('Finetune Proxy Error:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Finetuning failed' }, 500);
    }
});

export default aiRoutes;

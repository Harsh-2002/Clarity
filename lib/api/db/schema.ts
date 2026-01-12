import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Notes
export const notes = sqliteTable('notes', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    content: text('content').notNull(), // JSON string (Tiptap)
    isPublished: integer('is_published', { mode: 'boolean' }).default(false),
    publishedSlug: text('published_slug').unique(),
    version: integer('version').default(1),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }), // Soft delete
}, (table) => ({
    publishedSlugIdx: index('published_slug_idx').on(table.publishedSlug),
}));

// Transcripts
export const transcripts = sqliteTable('transcripts', {
    id: text('id').primaryKey(),
    recordingId: text('recording_id'),
    text: text('text').notNull(),
    fineTunedText: text('fine_tuned_text'),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    tags: text('tags'), // JSON array
    version: integer('version').default(1),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => ({
    recordingIdIdx: index('recording_id_idx').on(table.recordingId),
}));

// Settings (single row)
export const settings = sqliteTable('settings', {
    id: integer('id').primaryKey().default(1),
    selectedProvider: text('selected_provider'),
    selectedTranscriptionModel: text('selected_transcription_model'),
    selectedFinetuneModel: text('selected_finetune_model'),
    customSystemPrompt: text('custom_system_prompt'),
    autoFineTune: integer('auto_fine_tune', { mode: 'boolean' }).default(false),
    onboardingComplete: integer('onboarding_complete', { mode: 'boolean' }).default(false),
    theme: text('theme').default('system'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// Provider Configs (encrypted API keys)
export const providers = sqliteTable('providers', {
    id: text('id').primaryKey(), // 'openai', 'groq', 'assemblyai'
    name: text('name').notNull(),
    encryptedApiKey: text('encrypted_api_key').notNull(), // AES-256-GCM
    models: text('models').notNull(), // JSON
    limits: text('limits').notNull(), // JSON
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// Sessions (for JWT refresh tokens)
export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(),
    refreshToken: text('refresh_token').notNull(),
    deviceName: text('device_name'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

// Users (Single Admin usually, but extensible)
export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    username: text('username').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// System Configuration (Secrets & Keys)
// Stored in DB so user doesn't need to manage ENV vars
export const systemConfig = sqliteTable('system_config', {
    id: integer('id').primaryKey().default(1),
    jwtSecret: text('jwt_secret').notNull(),
    encryptionKey: text('encryption_key').notNull(), // Hex string
    setupComplete: integer('setup_complete', { mode: 'boolean' }).default(false),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// Sync Log (for delta sync)
export const syncLog = sqliteTable('sync_log', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    entityType: text('entity_type').notNull(), // 'note', 'transcript', 'settings', 'provider'
    entityId: text('entity_id').notNull(),
    operation: text('operation').notNull(), // 'create', 'update', 'delete'
    version: integer('version').notNull(),
    timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

// Tasks
export const tasks = sqliteTable('tasks', {
    id: text('id').primaryKey(),
    text: text('text').notNull(),
    completed: integer('completed', { mode: 'boolean' }).default(false),
    priority: text('priority').default('medium'), // 'low', 'medium', 'high'
    dueDate: integer('due_date', { mode: 'timestamp' }),
    position: integer('position').default(0), // For sorting
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Kanban Columns
export const kanbanColumns = sqliteTable('kanban_columns', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    position: integer('position').default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Kanban Cards
export const kanbanCards = sqliteTable('kanban_cards', {
    id: text('id').primaryKey(),
    columnId: text('column_id').references(() => kanbanColumns.id, { onDelete: 'cascade' }).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    position: integer('position').default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Canvases (Tldraw whiteboard data)
export const canvases = sqliteTable('canvases', {
    id: text('id').primaryKey(),
    name: text('name').notNull().default('Untitled Canvas'),
    data: text('data').notNull(), // JSON blob from Tldraw
    thumbnail: text('thumbnail'), // Base64 preview image (optional)
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Type exports
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SyncLogEntry = typeof syncLog.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type KanbanCard = typeof kanbanCards.$inferSelect;
export type Canvas = typeof canvases.$inferSelect;
export type NewCanvas = typeof canvases.$inferInsert;


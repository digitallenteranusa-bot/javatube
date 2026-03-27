import { Database } from 'bun:sqlite';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const APP_DIR = path.resolve(import.meta.dir, '..');

export const db = new Database(path.join(APP_DIR, 'data', 'app.db'));

export async function initDatabase() {
	// Create directories
	await mkdir(path.join(APP_DIR, 'data'), { recursive: true });
	await mkdir(path.join(APP_DIR, 'uploads', 'videos'), { recursive: true });
	await mkdir(path.join(APP_DIR, 'uploads', 'thumbnails'), { recursive: true });
	await mkdir(path.join(APP_DIR, 'uploads', 'hls'), { recursive: true });
	await mkdir(path.join(APP_DIR, 'uploads', 'avatars'), { recursive: true });
	await mkdir(path.join(APP_DIR, 'uploads', 'live'), { recursive: true });

	// Enable WAL mode for better concurrency
	db.run('PRAGMA journal_mode=WAL');

	// Create tables
	db.run(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			display_name TEXT DEFAULT '',
			bio TEXT DEFAULT '',
			avatar TEXT DEFAULT '',
			role TEXT NOT NULL DEFAULT 'user',
			email_verified INTEGER DEFAULT 0,
			totp_secret TEXT DEFAULT '',
			totp_enabled INTEGER DEFAULT 0,
			stream_key TEXT DEFAULT '',
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS videos (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT DEFAULT '',
			filename TEXT NOT NULL,
			thumbnail TEXT,
			status TEXT NOT NULL DEFAULT 'processing',
			type TEXT NOT NULL DEFAULT 'video',
			duration REAL DEFAULT 0,
			views INTEGER DEFAULT 0,
			likes INTEGER DEFAULT 0,
			dislikes INTEGER DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (user_id) REFERENCES users(id)
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS comments (
			id TEXT PRIMARY KEY,
			video_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			parent_id TEXT DEFAULT NULL,
			content TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id) REFERENCES users(id),
			FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS subscriptions (
			id TEXT PRIMARY KEY,
			subscriber_id TEXT NOT NULL,
			channel_id TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE(subscriber_id, channel_id),
			FOREIGN KEY (subscriber_id) REFERENCES users(id),
			FOREIGN KEY (channel_id) REFERENCES users(id)
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS notifications (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			type TEXT NOT NULL,
			title TEXT NOT NULL,
			message TEXT DEFAULT '',
			link TEXT DEFAULT '',
			is_read INTEGER DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (user_id) REFERENCES users(id)
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS likes (
			id TEXT PRIMARY KEY,
			video_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			type TEXT NOT NULL DEFAULT 'like',
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE(video_id, user_id),
			FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id) REFERENCES users(id)
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS playlists (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT DEFAULT '',
			is_public INTEGER DEFAULT 1,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (user_id) REFERENCES users(id)
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS playlist_items (
			id TEXT PRIMARY KEY,
			playlist_id TEXT NOT NULL,
			video_id TEXT NOT NULL,
			position INTEGER DEFAULT 0,
			added_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE(playlist_id, video_id),
			FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
			FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS email_tokens (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			type TEXT NOT NULL,
			token TEXT UNIQUE NOT NULL,
			expires_at TEXT NOT NULL,
			used INTEGER DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (user_id) REFERENCES users(id)
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS view_logs (
			id TEXT PRIMARY KEY,
			video_id TEXT NOT NULL,
			viewer_ip TEXT DEFAULT '',
			viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
		)
	`);

	// Seed default admin account
	const adminExists = db.query("SELECT id FROM users WHERE username = 'java'").get();
	if (!adminExists) {
		const { randomId } = await import('../../src/utils/utils');
		const id = randomId(16);
		const passwordHash = await Bun.password.hash('java@ind.net');
		db.run(
			"INSERT INTO users (id, username, email, password_hash, display_name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)",
			[id, 'java', 'admin@javatube.local', passwordHash, 'JavaTube Admin', 'admin', 1],
		);
		Log.info('Default admin account created — username: java');
	}

	// Migrations for existing databases
	const migrate = (table: string, column: string, definition: string) => {
		const cols = (db.query(`PRAGMA table_info(${table})`).all() as any[]).map((c: any) => c.name);
		if (!cols.includes(column)) db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
	};

	migrate('users', 'display_name', "TEXT DEFAULT ''");
	migrate('users', 'bio', "TEXT DEFAULT ''");
	migrate('users', 'avatar', "TEXT DEFAULT ''");
	migrate('users', 'role', "TEXT NOT NULL DEFAULT 'user'");
	migrate('users', 'email_verified', 'INTEGER DEFAULT 0');
	migrate('users', 'totp_secret', "TEXT DEFAULT ''");
	migrate('users', 'totp_enabled', 'INTEGER DEFAULT 0');
	migrate('users', 'stream_key', "TEXT DEFAULT ''");
	migrate('videos', 'likes', 'INTEGER DEFAULT 0');
	migrate('videos', 'dislikes', 'INTEGER DEFAULT 0');
	migrate('videos', 'type', "TEXT NOT NULL DEFAULT 'video'");
	migrate('comments', 'parent_id', 'TEXT DEFAULT NULL');
}

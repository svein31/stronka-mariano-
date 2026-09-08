import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, chmodSync } from 'node:fs'
import { dirname } from 'node:path'
import {migrateExtensions} from './extensions.mjs'
import {migrateService} from './migrations-service.mjs'
import {migrateEditorial} from './editorial.mjs'
export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path),{recursive:true,mode:0o700})
  const db = new DatabaseSync(path)
  if (path !== ':memory:') chmodSync(path,0o600)
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)')
  if (!db.prepare('SELECT version FROM schema_migrations WHERE version=1').get()) {
    db.exec(`BEGIN IMMEDIATE;
CREATE TABLE orders (
 id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL, access_hash TEXT NOT NULL,
 created_at TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('awaiting_arrangement','confirmed','cancelled')),
 payment_status TEXT NOT NULL CHECK(payment_status IN ('not_requested','pending','paid','failed','refunded')),
 payment_provider TEXT, provider_reference TEXT, currency TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount>=0), snapshot TEXT NOT NULL, customer TEXT NOT NULL,
 policy_version TEXT NOT NULL, demo INTEGER NOT NULL CHECK(demo IN (0,1))
);
CREATE INDEX orders_created_at ON orders(created_at);
CREATE TABLE contact_messages (id TEXT PRIMARY KEY,created_at TEXT NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL,message TEXT NOT NULL,demo INTEGER NOT NULL);
CREATE TABLE newsletter_requests (email TEXT PRIMARY KEY,created_at TEXT NOT NULL,policy_version TEXT NOT NULL,consent_text TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending_confirmation',demo INTEGER NOT NULL);
INSERT INTO schema_migrations VALUES (1);
COMMIT;`)
  }
  migrateExtensions(db)
  migrateService(db)
  migrateEditorial(db)
  return db
}

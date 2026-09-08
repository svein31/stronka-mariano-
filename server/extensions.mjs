import seed from '../shared/catalog.json' with {type:'json'}
export function migrateExtensions(db) {
 if(db.prepare('SELECT 1 FROM schema_migrations WHERE version=2').get())return
 db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE products(slug TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE admin_sessions(hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL, touched INTEGER NOT NULL, credential_hash TEXT NOT NULL);
 CREATE TABLE otp_used(step INTEGER PRIMARY KEY);
 CREATE TABLE rate_limits(key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);
 CREATE TABLE audit_events(id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, event TEXT NOT NULL, request_id TEXT, detail TEXT);
 CREATE TABLE assets(id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes BLOB NOT NULL, order_id TEXT REFERENCES orders(id), created_at TEXT NOT NULL);
 CREATE TABLE order_events(id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), created_at TEXT NOT NULL, stage TEXT NOT NULL, note TEXT NOT NULL, photos TEXT NOT NULL);
 CREATE INDEX order_events_order ON order_events(order_id,created_at);
 ALTER TABLE orders ADD COLUMN stage TEXT NOT NULL DEFAULT 'received';
 ALTER TABLE orders ADD COLUMN estimated_date TEXT;
 ALTER TABLE orders ADD COLUMN access_expires INTEGER;
 ALTER TABLE orders ADD COLUMN access_revoked INTEGER NOT NULL DEFAULT 0;
 ALTER TABLE orders ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
 CREATE TABLE tracking_tokens(hash TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), expires INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE mail_outbox(id TEXT PRIMARY KEY, dedupe TEXT UNIQUE NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, available INTEGER NOT NULL, lease INTEGER, created_at TEXT NOT NULL);
 CREATE INDEX mail_pending ON mail_outbox(status,available);
 CREATE TABLE newsletter_tokens(hash TEXT PRIMARY KEY, email TEXT NOT NULL, purpose TEXT NOT NULL, expires INTEGER NOT NULL);
 CREATE TABLE custom_requests(id TEXT PRIMARY KEY, created_at TEXT NOT NULL, email TEXT NOT NULL, details TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', quoted_amount INTEGER);
 CREATE TABLE operations(key TEXT PRIMARY KEY, value TEXT NOT NULL);
 `)
 try {
  const insert=db.prepare('INSERT INTO products(slug,data) VALUES (?,?)')
  for(const p of seed)insert.run(p.slug,JSON.stringify({...p,available:true,measurementsVerified:false,measurements:[],gallery:[],video:'',customMaterials:[p.material],customPrints:[p.printStyle]}))
  db.prepare('UPDATE orders SET access_expires=CAST(strftime(\'%s\',created_at) AS INTEGER)*1000+?').run(30*86400000)
  db.exec('INSERT INTO schema_migrations VALUES(2); COMMIT;')
 }catch(e){db.exec('ROLLBACK');throw e}
}


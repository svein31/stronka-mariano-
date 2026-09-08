export function migrateService(db) {
 if (db.prepare('SELECT 1 FROM schema_migrations WHERE version=3').get()) return
 db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE staff(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','production','support')),password_hash TEXT NOT NULL,totp_secret TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,revision INTEGER NOT NULL DEFAULT 1);
 ALTER TABLE admin_sessions ADD COLUMN actor_id TEXT NOT NULL DEFAULT 'owner';
 CREATE TABLE staff_otp(actor_id TEXT NOT NULL,step INTEGER NOT NULL,PRIMARY KEY(actor_id,step));
 CREATE TABLE change_history(id INTEGER PRIMARY KEY,created_at TEXT NOT NULL,actor_id TEXT NOT NULL,action TEXT NOT NULL,entity_id TEXT NOT NULL);
 CREATE INDEX history_entity ON change_history(entity_id,id);
 CREATE TABLE specifications(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),version INTEGER NOT NULL,content TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>=0),estimated_date TEXT NOT NULL,expires INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('offered','accepted','changes_requested','superseded')),created_at TEXT NOT NULL,decided_at TEXT,UNIQUE(order_id,version));
 CREATE TABLE order_messages(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),author TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL,request_key TEXT NOT NULL,UNIQUE(order_id,author,request_key));
 CREATE INDEX messages_order ON order_messages(order_id,created_at,id);
 ALTER TABLE custom_requests ADD COLUMN order_id TEXT REFERENCES orders(id);
 CREATE TABLE materials(id TEXT PRIMARY KEY,name TEXT NOT NULL,unit TEXT NOT NULL CHECK(unit IN ('cm','piece')),stock INTEGER NOT NULL CHECK(stock>=0),revision INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE reservations(order_id TEXT NOT NULL REFERENCES orders(id),material_id TEXT NOT NULL REFERENCES materials(id),quantity INTEGER NOT NULL CHECK(quantity>0),state TEXT NOT NULL CHECK(state IN ('reserved','consumed','released')),PRIMARY KEY(order_id,material_id));
 CREATE TABLE stock_events(id TEXT PRIMARY KEY,material_id TEXT NOT NULL REFERENCES materials(id),delta INTEGER NOT NULL,note TEXT NOT NULL,actor_id TEXT NOT NULL,created_at TEXT NOT NULL,request_key TEXT UNIQUE NOT NULL);
 CREATE TABLE production_days(day TEXT PRIMARY KEY,capacity INTEGER NOT NULL CHECK(capacity>=0 AND capacity<=14400));
 CREATE TABLE production_tasks(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),day TEXT NOT NULL REFERENCES production_days(day),minutes INTEGER NOT NULL CHECK(minutes>0),title TEXT NOT NULL,assignee TEXT REFERENCES staff(id),status TEXT NOT NULL CHECK(status IN ('planned','done','cancelled')),revision INTEGER NOT NULL DEFAULT 1);
 CREATE INDEX tasks_day ON production_tasks(day,status);
 CREATE TABLE jobs(id TEXT PRIMARY KEY,kind TEXT NOT NULL,dedupe TEXT UNIQUE NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,available INTEGER NOT NULL,lease INTEGER,lease_token TEXT,last_error TEXT,created_at TEXT NOT NULL);
 CREATE INDEX jobs_due ON jobs(status,available);
 ALTER TABLE assets ADD COLUMN storage_key TEXT;
 ALTER TABLE assets ADD COLUMN thumbnail_key TEXT;
 ALTER TABLE assets ADD COLUMN byte_size INTEGER NOT NULL DEFAULT 0;
 ALTER TABLE assets ADD COLUMN storage_backend TEXT;
 ALTER TABLE assets ADD COLUMN checksum TEXT;
 UPDATE assets SET byte_size=length(bytes);
 CREATE TABLE shipments(id TEXT PRIMARY KEY,order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),provider TEXT NOT NULL DEFAULT 'inpost',provider_id TEXT,tracking_number TEXT,status TEXT NOT NULL,request TEXT NOT NULL,updated_at TEXT NOT NULL,environment TEXT NOT NULL DEFAULT 'sandbox');
 INSERT INTO schema_migrations VALUES(3);
 COMMIT;`)
 db.exec('PRAGMA optimize')
}

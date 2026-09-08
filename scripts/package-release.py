"""Produce source+build and static Netlify archives, excluding all private runtime data."""
import argparse
import json
import subprocess
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument('--commit', default='')
args = parser.parse_args()
out = Path(args.output).resolve()
out.mkdir(parents=True, exist_ok=True)
if not (root / 'dist/index.html').is_file():
    raise SystemExit('Run npm run build first.')
files = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
def allowed(name):
    p = Path(name)
    return bool(name) and not any(part in {'node_modules', '.git', 'var', 'backups', '.openai'} for part in p.parts) and not (p.name.startswith('.env') and p.name != '.env.example') and not any(name.endswith(ext) for ext in ('.sqlite', '.sqlite-wal', '.sqlite-shm', '.enc', '.zip', '.pem', '.key'))
manifest = json.dumps({'commit': args.commit or subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(), 'payments': False, 'containsCustomerData': False}, indent=2)
with zipfile.ZipFile(out / 'mariano-full-build.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for name in sorted(filter(allowed, files)):
        p = root / name
        if p.is_file(): archive.write(p, 'mariano/' + name)
    for p in sorted((root / 'dist').rglob('*')):
        if p.is_file(): archive.write(p, 'mariano/' + str(p.relative_to(root)))
    archive.writestr('mariano/release-manifest.json', manifest)
with zipfile.ZipFile(out / 'mariano-netlify.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for p in sorted((root / 'dist').rglob('*')):
        if p.is_file(): archive.write(p, str(p.relative_to(root / 'dist')))
    archive.writestr('_redirects', '/api/* /api-unavailable.json 200\n/media/uploads/* /404.html 404\n/* /index.html 200\n')
    archive.writestr('_headers', '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n/api/*\n  Cache-Control: no-store\n/media/*\n  Cache-Control: public, max-age=3600\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n')
    archive.writestr('api-unavailable.json', json.dumps({'error':'Backend nie jest jeszcze podłączony. Zobacz instrukcję RELEASE.md.', 'code':'backend_not_configured'}, ensure_ascii=False))
    archive.writestr('404.html', '<!doctype html><html lang="pl"><meta charset="utf-8"><title>Brak pliku</title><p>Plik nie jest dostępny.</p></html>')
    archive.writestr('RELEASE.md', (root / 'RELEASE.md').read_text())
    archive.writestr('release-manifest.json', manifest)
for path in [out / 'mariano-full-build.zip', out / 'mariano-netlify.zip']:
    with zipfile.ZipFile(path) as archive:
        if archive.testzip(): raise SystemExit('Corrupt archive: ' + str(path))
    print(json.dumps({'path':str(path),'bytes':path.stat().st_size}))

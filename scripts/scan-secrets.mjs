import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean)
let failed=false
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/AKIA[0-9A-Z]{16}/,/gh[pousr]_[A-Za-z0-9]{30,}/,/(?:ADMIN_PASSWORD_HASH|ADMIN_TOTP_SECRET|DATA_KEY|BACKUP_KEY|SMTP_PASS|AWS_SECRET_ACCESS_KEY)[ \t]*=[ \t]*["']?[A-Za-z0-9/+_:=-]{16,}/]
for(const path of files){
 if(path==='scripts/scan-secrets.mjs')continue
 if(/(^|\/)\.env($|\.)/.test(path)&&!path.endsWith('.env.example')){console.error('Private environment file tracked: '+path);failed=true;continue}
 if(!/\.(mjs|js|ts|tsx|json|ya?ml|md|example)$/.test(path))continue
 const text=readFileSync(path,'utf8')
 if(patterns.some(re=>re.test(text))){console.error('Possible secret in '+path+' — inspect locally; value not printed.');failed=true}
}
if(failed)process.exitCode=1;else console.log('Tracked source secret-pattern check passed. Enable GitHub secret scanning/push protection for broader coverage.')

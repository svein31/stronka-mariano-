import {createInterface} from 'node:readline/promises'
import {Writable} from 'node:stream'
import {readFile,writeFile,chmod} from 'node:fs/promises'
import {randomBytes} from 'node:crypto'
import {generateSecret,verify} from 'otplib'
import {passwordHash} from '../server/security.mjs'
let hidden=false
const output=new Writable({write(chunk,encoding,callback){if(!hidden)process.stdout.write(chunk,encoding);callback()}})
const rl=createInterface({input:process.stdin,output,terminal:true})
try{
 const email=(await rl.question('E-mail właściciela: ')).trim().toLowerCase()
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Nieprawidłowy e-mail.')
 process.stdout.write('Hasło (minimum 8 znaków, wpisywanie ukryte): ');hidden=true
 const password=await rl.question('');hidden=false;process.stdout.write('\n')
 const hashed=await passwordHash(password)
 const enable=(await rl.question('Włączyć 2FA? Wymagane przed publicznym uruchomieniem [T/n]: ')).trim().toLowerCase()!=='n'
 let secret=''
 if(enable){
  secret=generateSecret()
  process.stdout.write('Dodaj ręcznie konto TOTP w aplikacji uwierzytelniającej. Zachowaj klucz w bezpiecznym miejscu.\nKlucz: '+secret+'\n')
  const code=(await rl.question('Wpisz aktualny kod 6-cyfrowy: ')).trim()
  if(!(await verify({secret,token:code})).valid)throw Error('Kod nie pasuje. Konfiguracja nie została zapisana.')
 }
 let existing=''
 try{existing=await readFile('.env','utf8')}catch{existing=await readFile('.env.example','utf8')}
 const values={ADMIN_EMAIL:email,ADMIN_PASSWORD_HASH:hashed,ADMIN_TOTP_SECRET:secret}
 for(const key of ['DATA_KEY','BACKUP_KEY'])if(!new RegExp('^'+key+'=[a-f0-9]{64}$','m').test(existing))values[key]=randomBytes(32).toString('hex')
 for(const [key,value] of Object.entries(values)){const pattern=new RegExp('^'+key+'=.*$','m');existing=pattern.test(existing)?existing.replace(pattern,key+'='+value):existing+'\n'+key+'='+value}
 await writeFile('.env',existing+'\n',{mode:0o600});await chmod('.env',0o600)
 process.stdout.write('Zapisano prywatną konfigurację. Uruchom ponownie serwer i otwórz /admin. Nie wysyłaj pliku .env do GitHuba.\n')
}finally{hidden=false;rl.close()}


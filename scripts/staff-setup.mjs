import {createInterface} from 'node:readline/promises'
import {Writable} from 'node:stream'
import {randomUUID} from 'node:crypto'
import {generateSecret,verify} from 'otplib'
import {passwordHash} from '../server/security.mjs'
import {openDatabase} from '../server/database.mjs'
import {emailField,textField} from '../server/commerce.mjs'
import {history,transaction} from '../server/service.mjs'
let hidden=false,db
const output=new Writable({write(chunk,encoding,done){if(!hidden)process.stdout.write(chunk,encoding);done()}})
const rl=createInterface({input:process.stdin,output,terminal:true})
try{
 const email=emailField(await rl.question('E-mail pracownika: '))
 if(email===process.env.ADMIN_EMAIL?.toLowerCase())throw Error('Dla głównego właściciela użyj owner:setup.')
 const name=textField(await rl.question('Imię wyświetlane: '),'name',2,100)
 const role=(await rl.question('Rola [production/support/owner]: ')).trim()
 if(!['production','support','owner'].includes(role))throw Error('Nieprawidłowa rola.')
 process.stdout.write('Nowe hasło (wpisywanie ukryte): ');hidden=true
 const password=await rl.question('');hidden=false;process.stdout.write('\n')
 const hashed=await passwordHash(password),secret=generateSecret()
 process.stdout.write('Pracownik dodaje konto TOTP do aplikacji. Klucz pokaż mu prywatnie: '+secret+'\n')
 const otp=(await rl.question('Aktualny kod TOTP: ')).trim()
 if(!(await verify({secret,token:otp,epochTolerance:0})).valid)throw Error('Kod nie pasuje. Nie zapisano konta.')
 db=openDatabase(process.env.DB_PATH||'var/store.sqlite')
 transaction(db,()=>{
  const id=db.prepare('SELECT id FROM staff WHERE email=?').get(email)?.id||randomUUID()
  db.prepare('INSERT INTO staff(id,email,name,role,password_hash,totp_secret) VALUES(?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role,password_hash=excluded.password_hash,totp_secret=excluded.totp_secret,active=1,revision=staff.revision+1').run(id,email,name,role,hashed,secret)
  db.prepare('DELETE FROM admin_sessions WHERE actor_id=?').run(id);history(db,'operator','staff_provisioned',id)
 })
 process.stdout.write('Konto zapisane. Poprzednie sesje tego pracownika unieważniono.\n')
}finally{hidden=false;rl.close();db?.close()}

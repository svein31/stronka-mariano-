import {openDatabase} from '../server/database.mjs'
import {runBackup,restoreBackup} from '../server/backup.mjs'
const [command,...args]=process.argv.slice(2)
if(command==='restore'){
 if(args.length!==2)throw Error('Usage: npm run backup:restore -- archive.enc NEW-database.sqlite')
 console.log(await restoreBackup(args[0],args[1],process.env.BACKUP_KEY))
}else{
 const db=openDatabase(process.env.DB_PATH||'var/store.sqlite')
 try{console.log(await runBackup(db))}finally{db.close()}
}


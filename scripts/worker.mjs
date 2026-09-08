import {resolve} from 'node:path'
import {openDatabase} from '../server/database.mjs'
import {startWorker} from '../server/worker.mjs'
const db=openDatabase(process.env.DB_PATH||resolve('var/store.sqlite'))
const stop=startWorker(db)
// The worker timer is unref'd for embedded use; standalone mode keeps the process alive.
const alive=setInterval(()=>{},60000)
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{clearInterval(alive);await stop();db.close()})
console.info('Workshop worker started')

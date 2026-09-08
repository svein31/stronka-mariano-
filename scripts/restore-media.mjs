import {restoreMedia} from '../server/backup.mjs'
if(!process.argv[2])throw Error('Użycie: npm run backup:restore-media -- pobrany-manifest.media.enc')
console.info(await restoreMedia(process.argv[2]))

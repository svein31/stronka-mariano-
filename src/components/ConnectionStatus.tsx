import {useEffect,useState} from 'react'
import {useStore} from '../state/store'
export function ConnectionStatus(){
 const {error,retry}=useStore(),[offline,setOffline]=useState(false)
 useEffect(()=>{const update=()=>setOffline(!navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
 if(!error&&!offline)return null
 return <aside className="connection-status" role="status"><p><strong>{offline?'Brak połączenia z internetem.':'Katalog serwera jest chwilowo niedostępny.'}</strong> Wyświetlane dane mogą być nieaktualne. Koszyk pozostaje zapisany na tym urządzeniu.</p><button type="button" onClick={retry} disabled={offline}>Połącz ponownie</button></aside>
}

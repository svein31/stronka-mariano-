import {useState,type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {post} from '../lib/api'
import {useStore} from '../state/store'
export function Newsletter() {
 const {config}=useStore()
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false)
 async function submit(e:FormEvent<HTMLFormElement>) {e.preventDefault();if(busy)return;const data=new FormData(e.currentTarget);setBusy(true);setStatus('');try {await post('/api/newsletter',{email:data.get('email'),consent:data.get('consent')==='on'});setStatus(config?.emailEnabled?'Sprawdź skrzynkę i potwierdź zapis.':'Zapis zachowany. Wysyłka wymaga konfiguracji poczty przez pracownię.')}catch(e){setStatus((e as Error).message)}finally{setBusy(false)}}
 return <form onSubmit={submit} className="newsletter"><h3>Następny drop.</h3><p className="small">Kolekcje i premiery na Twojej poczcie.</p><label className="field">Twój e-mail<input type="email" name="email" required autoComplete="email" maxLength={254}/></label><label className="check small"><input type="checkbox" name="consent" required/><span>Chcę otrzymywać wiadomości o kolekcjach i premierach Mariano. <Link to="/privacy">Prywatność</Link></span></label><button className="btn btn--light" disabled={busy}>{busy?'Zapisujemy…':'Zapisz mnie →'}</button><p role="status" className="small">{status}</p></form>
}

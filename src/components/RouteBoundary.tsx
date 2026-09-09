import {Component,Suspense,type ReactNode} from 'react'
import {useLocation} from 'react-router-dom'

class RouteError extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  render(){return this.state.failed?<section className="shell section route-state" role="alert"><p className="eyebrow">MARIANO</p><h1 id="route-title" tabIndex={-1}>Spróbujmy jeszcze raz.</h1><p>Nie udało się wczytać widoku. Sprawdź połączenie i odśwież stronę.</p><button className="btn" onClick={()=>window.location.reload()}>Wczytaj ponownie</button><a href="/shop">Wróć do kolekcji</a></section>:this.props.children}
}
export function RouteBoundary({children}:{children:ReactNode}){
  const {pathname}=useLocation()
  return <RouteError key={pathname}><Suspense fallback={<section className="shell section route-state" role="status" aria-live="polite"><p className="eyebrow">MARIANO</p><h1 id="route-title" tabIndex={-1}>Wczytujemy widok…</h1><p>Jeszcze chwila.</p></section>}>{children}</Suspense></RouteError>
}

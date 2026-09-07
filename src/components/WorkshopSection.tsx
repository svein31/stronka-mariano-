import type {ReactNode} from 'react'
export function WorkshopSection({children,tone='canvas',className='',id}:{children:ReactNode;tone?:'canvas'|'ecru'|'dark';className?:string;id?:string}) {
 return <section id={id} className={'section tone-'+tone+' '+className}>{children}</section>
}

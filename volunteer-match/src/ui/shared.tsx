import type { ReactNode } from 'react'
import { ArrowRight, CircleAlert, type LucideIcon } from 'lucide-react'

export const pageLabels = {
  inicio: 'Inicio', proyecto: 'Acerca de', teoria: 'Marco teórico',
  voluntarios: 'Voluntarios', proyectos: 'Proyectos',
  asignacion: 'Asignación de voluntariado', resultados: 'Resultados', conclusiones: 'Conclusiones',
  enlaces: 'Links de interés',
}
export type Page = keyof typeof pageLabels

export function pageLink(page: Page) {
  return '#/' + page
}

const numberFormatter = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 })
export const formatNumber = (value: number) => numberFormatter.format(value)
export const formatUnits = (value: number) => formatNumber(value / 100)

export function PageHeading({ tag, title, description, action }: {
  tag: string; title: string; description: string; action?: ReactNode
}) {
  return <header className="page-heading">
    <div className="container heading-inner">
      <div>
        <p className="eyebrow"><span />{tag}</p>
        <h1>{title}</h1>
        <p className="page-intro">{description}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  </header>
}

export function NextLink({ to, children }: { to: Page; children: ReactNode }) {
  return <a className="text-link" href={pageLink(to)}>{children}<ArrowRight size={16} aria-hidden /></a>
}

export function EmptyState({ icon: Icon, title, children, action }: {
  icon: LucideIcon; title: string; children: ReactNode; action?: ReactNode
}) {
  return <div className="empty-state">
    <span className="icon-tile"><Icon size={24} aria-hidden /></span>
    <h2>{title}</h2><p>{children}</p>{action}
  </div>
}

export function Alert({ children, kind = 'info' }: { children: ReactNode; kind?: 'info' | 'error' }) {
  return <div className={'notice ' + kind} role={kind === 'error' ? 'alert' : 'status'}>
    <CircleAlert size={19} aria-hidden /> <div>{children}</div>
  </div>
}

export function TagList({ items }: { items: readonly string[] }) {
  return items.length ? <ul className="tag-list" aria-label="Habilidades">
    {items.map(item => <li key={item}>{item}</li>)}
  </ul> : <span className="muted">Sin habilidades registradas</span>
}

export function StatusPill({ active, yes = 'Activo', no = 'Inactivo' }: { active: boolean; yes?: string; no?: string }) {
  return <span className={'status-pill ' + (active ? 'active' : '')}><i aria-hidden />{active ? yes : no}</span>
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toLocaleUpperCase('es') ?? '').join('')
}

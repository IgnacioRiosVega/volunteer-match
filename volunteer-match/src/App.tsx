import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, CheckCircle2, Menu, X } from 'lucide-react'
import brandMark from './assets/mark.svg'
import { demoCatalog } from './data/demo'
import { LocalStorageCatalogRepository, type CatalogRepository } from './data/repository'
import { AssignmentHelp } from './ui/assignment-actions'
import { catalogSkillOptions, mergeSkillOptions } from './domain/skills'
import { SocialProject, Volunteer, type CatalogSnapshot } from './domain/catalog'
import { About, Conclusions, Theory } from './ui/academics'
import { ConfirmBox, Projects, Volunteers } from './ui/catalog-pages'
import { Home } from './ui/home'
import { InterestLinks } from './ui/interest-links'
import { Alert, pageLabels, pageLink, type Page } from './ui/shared'
import { initialSimulation, Simulator } from './ui/simulator'

const Results = lazy(() => import('./ui/results').then(module => ({ default: module.Results })))
const repository = new LocalStorageCatalogRepository()
const navigation: Page[] = ['inicio', 'proyecto', 'teoria', 'voluntarios', 'proyectos', 'resultados', 'conclusiones', 'enlaces']

function currentPage(): Page {
  const requested = window.location.hash.replace(/^#\//, '')
  const aliases: Record<string, Page> = { aprende: 'teoria', simulador: 'asignacion' }
  const page = Object.hasOwn(aliases, requested) ? aliases[requested] : requested
  return Object.hasOwn(pageLabels, page) ? page as Page : 'inicio'
}

function Brand() {
  return <a className="brand" href={pageLink('inicio')} aria-label="Volunteer Match, inicio">
    <img src={brandMark} alt="Emblema de Naciones Unidas" width="52" height="46" />
    <span><strong>Volunteer Match</strong></span>
  </a>
}

function Header({ page, main }: { page: Page; main: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!expanded) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false)
        menuButton.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  return <header className="site-header">
    <a className="skip-link" href="#contenido" onClick={event => { event.preventDefault(); main() }}>Saltar al contenido</a>
    <div className="container header-inner">
      <Brand />
      <button type="button" ref={menuButton} className="icon-button menu-toggle" aria-expanded={expanded} aria-controls="main-navigation" aria-label={expanded ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setExpanded(!expanded)}>
        {expanded ? <X size={25} aria-hidden /> : <Menu size={25} aria-hidden />}
      </button>
      <nav className={'navigation ' + (expanded ? 'expanded' : '')} id="main-navigation" aria-label="Navegación principal">
        {navigation.map(link => <a key={link} href={pageLink(link)} aria-current={page === link ? 'page' : undefined} onClick={() => setExpanded(false)}>{pageLabels[link]}</a>)}
        <a className="button button-nav" href={pageLink('asignacion')} aria-current={page === 'asignacion' ? 'page' : undefined} onClick={() => setExpanded(false)}>Asignación de voluntariado <ArrowRight size={16} aria-hidden /></a>
      </nav>
    </div>
  </header>
}

function Footer() {
  return <footer className="site-footer">
    <div className="container footer-top">
      <div><strong className="footer-wordmark">Volunteer Match</strong><p>Connecting skills. Creating impact.</p></div>
      <AssignmentHelp />
    </div>
    <div className="container footer-bottom"><span>Volunteer Match · Plataforma independiente</span><span>Los registros se guardan en este navegador.</span></div>
  </footer>
}

type Message = { kind: 'error' | 'success'; text: string }

export function App({ storage = repository }: { storage?: CatalogRepository }) {
  const [initial] = useState(() => storage.load())
  const [catalog, setCatalog] = useState(initial.catalog)
  const [page, setPage] = useState(currentPage)
  const [simulation, setSimulation] = useState(initialSimulation)
  const [restore, setRestore] = useState(false)
  const [message, setMessage] = useState<Message | null>(initial.warning ? { kind: 'error', text: initial.warning } : null)
  const main = useRef<HTMLElement>(null)
  const entities = useMemo(() => ({
    volunteers: catalog.volunteers.map(volunteer => new Volunteer(volunteer)),
    projects: catalog.projects.map(project => new SocialProject(project)),
  }), [catalog])

  const skillOptions = useMemo(() => catalogSkillOptions(catalog), [catalog])

  useEffect(() => {
    const change = () => {
      setPage(currentPage())
      setRestore(false)
    }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])

  useEffect(() => {
    document.title = pageLabels[page] + ' · Volunteer Match'
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    main.current?.focus({ preventScroll: true })
  }, [page])

  useEffect(() => {
    if (message?.kind !== 'success') return
    const timer = window.setTimeout(() => setMessage(null), 4500)
    return () => window.clearTimeout(timer)
  }, [message])

  const saveCatalog = (next: CatalogSnapshot, success: string) => {
    try {
      const updated = { ...next, skillOptions: mergeSkillOptions(catalog.skillOptions ?? [], catalogSkillOptions(next)) }
      storage.save(updated)
      setCatalog(updated)
      setSimulation(value => ({ ...value, prepared: null, result: null }))
      setMessage({ kind: 'success', text: success })
      return true
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar el catálogo.' })
      return false
    }
  }

  let content: ReactNode
  switch (page) {
    case 'inicio': content = <Home {...entities} />; break
    case 'proyecto': content = <About />; break
    case 'teoria': content = <Theory />; break
    case 'conclusiones': content = <Conclusions />; break
    case 'enlaces': content = <InterestLinks />; break
    case 'voluntarios': content = <Volunteers skillOptions={skillOptions} volunteers={catalog.volunteers} save={(volunteers, success) => saveCatalog({ ...catalog, volunteers }, success)} />; break
    case 'proyectos': content = <Projects skillOptions={skillOptions} projects={catalog.projects} save={(projects, success) => saveCatalog({ ...catalog, projects }, success)} />; break
    case 'asignacion': content = <Simulator {...entities} state={simulation} update={setSimulation} onRestore={() => {
      setRestore(true)
      document.documentElement.scrollTop = 0
    }} />; break
    case 'resultados': content = <Suspense fallback={<p className="container section-layout" role="status">Cargando resultados…</p>}><Results result={simulation.result} onOpen={result => setSimulation(value => ({ ...value, prepared: null, result }))} /></Suspense>; break
  }

  return <>
    <Header key={page} page={page} main={() => main.current?.focus()} />
    <main id="contenido" ref={main} tabIndex={-1}>
      {restore && <div className="container app-confirm">
        <ConfirmBox title="¿Restaurar los datos de demostración?" label="Restaurar datos" onCancel={() => setRestore(false)} onConfirm={() => {
          if (saveCatalog(demoCatalog(), 'Datos de demostración restaurados.')) {
            setSimulation(initialSimulation())
            setRestore(false)
          }
        }}>Se reemplazarán los voluntarios, proyectos y puestos del catálogo actual con los datos ficticios originales.</ConfirmBox>
      </div>}
      {content}
    </main>
    <Footer />
    {message && <div className="toast" aria-label="Estado del catálogo">
      {message.kind === 'error' ? <Alert kind="error">{message.text}</Alert> : <div className="toast-success" role="status"><CheckCircle2 size={19} aria-hidden />{message.text}</div>}
      <button type="button" className="icon-button" aria-label="Cerrar aviso" onClick={() => setMessage(null)}><X size={17} aria-hidden /></button>
    </div>}
  </>
}

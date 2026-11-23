import { ArrowRight } from 'lucide-react'
import communityPhoto from '../assets/voluntariado-comunitario.webp'
import type { SocialProject, Volunteer } from '../domain/catalog'
import { pageLink } from './shared'

const workflow = [
  { number: '01', title: 'Define el escenario', description: 'Registra a los voluntarios y decide qué necesita cada puesto. Indica las habilidades, los horarios y los requisitos.' },
  { number: '02', title: 'Construye la matriz', description: 'Ajusta los pesos y revisa qué tan bien encaja cada persona en cada puesto.' },
  { number: '03', title: 'Interpreta el resultado', description: 'Sigue el método húngaro paso a paso y descubre por qué algunas combinaciones aprovechan mejor las habilidades del grupo.' },
]

export function Home({ volunteers, projects }: {
  volunteers: readonly Volunteer[]
  projects: readonly SocialProject[]
}) {
  const openPositions = projects.flatMap(project => project.positions).filter(position => position.data.active)
  const recentProjects = projects.slice(-3).reverse()

  return <>
    <section className="hero" aria-labelledby="home-title">
      <div className="hero-layout">
        <div className="hero-copy">
          <p className="eyebrow">Voluntariado y proyectos sociales</p>
          <h1 id="home-title">El talento correcto.<br />Donde más importa.</h1>
          <p className="hero-lede">Conecta a personas voluntarias con proyectos que necesitan sus habilidades. Organiza perfiles, registra iniciativas y encuentra una distribución que considere experiencia, intereses y disponibilidad. Volunteer Match utiliza el algoritmo de asignación para aprovechar las capacidades del grupo y presentar decisiones claras, que puedes revisar paso a paso.</p>
          <div className="hero-actions">
            <a href={pageLink('asignacion')} className="button button-primary">Asignar voluntariado <ArrowRight size={18} aria-hidden /></a>
            <a href={pageLink('teoria')} className="hero-link">Conocer el método</a>
          </div>
        </div>
        <figure className="hero-media">
          <img src={communityPhoto} alt="Personas voluntarias preparan cuadernos y útiles para distribuirlos en su comunidad." fetchPriority="high" />
          <figcaption><strong>Trabajo comunitario</strong></figcaption>
        </figure>
      </div>
    </section>

    <section className="catalog-strip" aria-label="Resumen del catálogo">
      <div className="container catalog-strip-inner">
        <div className="strip-intro"><strong>El voluntariado en cifras</strong><span>Catálogo actualizado</span></div>
        <div className="strip-stat"><strong>{volunteers.length}</strong><span>Voluntarios registrados</span></div>
        <div className="strip-stat"><strong>{projects.length}</strong><span>Proyectos registrados</span></div>
        <div className="strip-stat"><strong>{openPositions.length}</strong><span>Puestos abiertos</span></div>
      </div>
    </section>

    <section className="container home-process">
      <div className="section-top"><div>
        <p className="eyebrow"><span /> Del catálogo a la asignación</p>
        <h2>Cómo organizar una asignación</h2>
        <p>Trabaja con tus voluntarios, proyectos y criterios de compatibilidad.</p>
      </div></div>
      <div className="workflow-grid">{workflow.map(({ number, title, description }) => <article key={number} className="workflow-card">
        <span className="workflow-number">{number}</span>
        <h3>{title}</h3><p>{description}</p>
      </article>)}</div>
    </section>

    <section className="impact">
      <div className="container impact-inner">
        <div>
          <p className="eyebrow"><span /> Propósito social</p>
          <h2>Una decisión que mira el conjunto</h2>
          <p>Una persona puede encajar en varios puestos. Comparar todas las combinaciones permite aprovechar sus habilidades y detectar vacantes que podrían requerir una nueva convocatoria.</p>
        </div>
        <div className="impact-example">
          {recentProjects.length ? <table className="data-table example-table">
            <caption>Últimos proyectos registrados</caption>
            <thead><tr><th scope="col">Proyecto</th><th scope="col">Organización</th><th scope="col">Puestos abiertos</th></tr></thead>
            <tbody>{recentProjects.map(project => <tr key={project.id}>
              <th scope="row">{project.name}</th><td>{project.data.organization}</td><td>{project.positions.filter(position => position.data.active).length}</td>
            </tr>)}</tbody>
          </table> : <p className="home-catalog-empty">Tu catálogo de proyectos está listo para recibir nuevas iniciativas.</p>}
        </div>
      </div>
    </section>
  </>
}

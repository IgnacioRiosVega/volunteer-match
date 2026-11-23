import { ExternalLink } from 'lucide-react'
import { interestLinks } from '../data/interest-links'
import { PageHeading } from './shared'

export function InterestLinks() {
  return <>
    <PageHeading tag="VOLUNTARIADO Y COOPERACIÓN" title="Links de interés"
      description="Encuentra oportunidades para participar, formarte y colaborar con organizaciones que trabajan por el desarrollo sostenible." />
    <div className="container section-layout">
      <div className="surface interest-table-scroll" tabIndex={0} role="region" aria-label="Recursos de voluntariado y cooperación">
        <table className="data-table interest-table">
          <caption className="sr-only">Páginas oficiales de voluntariado, oportunidades y formación</caption>
          <thead><tr><th scope="col">Organización y recurso</th><th scope="col">Descripción</th><th scope="col">Página oficial</th></tr></thead>
          <tbody>{interestLinks.map(resource => <tr key={resource.url}>
            <th scope="row"><div className="interest-resource">
              <span className={`interest-logo${'logoOnBlue' in resource && resource.logoOnBlue ? ' interest-logo-on-blue' : ''}`}><img src={resource.logo} alt="" width="100" height="68" /></span>
              <span>{resource.name}</span>
            </div></th>
            <td><p>{resource.description}</p></td>
            <td><a className="button button-secondary interest-visit" href={resource.url} target="_blank" rel="noopener noreferrer">
              Visitar página <ExternalLink size={16} aria-hidden />
              <span className="sr-only"> de {resource.name} (se abre en otra pestaña)</span>
            </a></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </>
}

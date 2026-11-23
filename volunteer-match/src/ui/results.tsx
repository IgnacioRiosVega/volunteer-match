import { useState } from 'react'
import { AssignmentFileActions } from './assignment-actions'
import { ArrowRight, BriefcaseBusiness, ChartNoAxesCombined, ClipboardList, Handshake, UsersRound } from 'lucide-react'
import type { AssignmentResult, PreparedAssignment } from '../domain/assignment'
import type { Pair } from '../domain/matrix'
import { blockerLabels, compatibilityCriteria, type BlockerKey } from '../domain/compatibility'
import { requiredPositionSkills } from '../domain/skills'
import { sdgLabel } from '../domain/sustainable-development'
import { Alert, EmptyState, formatNumber, formatUnits, initials, PageHeading, pageLink } from './shared'

function MatchTable({ input, pairs }: { input: PreparedAssignment; pairs: readonly Pair[] }) {
  if (!pairs.length) return <p className="table-empty">La selección actual queda pendiente de asignación.</p>
  return <div className="table-scroll" tabIndex={0} role="region" aria-label="Pares de la solución óptima">
    <table className="data-table match-table">
      <caption className="sr-only">Asignaciones óptimas</caption>
      <thead><tr><th scope="col">Voluntario</th><th scope="col">Puesto</th><th scope="col">Proyecto</th><th scope="col">Compatibilidad</th></tr></thead>
      <tbody>{pairs.map(({ row, column }) => {
        const person = input.volunteers[row]
        const role = input.positions[column]
        const score = input.matrix.units[row][column] ?? 0
        return <tr key={person.id}>
          <th scope="row"><span className="person-cell"><span className="avatar">{initials(person.name)}</span>{person.name}</span></th>
          <td>{role.name}</td><td>{role.project.name}</td><td><span className="match-score"><span className="score-track" aria-hidden="true"><span style={{ width: score / 100 + '%' }} /></span>{formatUnits(score)} / 100</span></td>
        </tr>
      })}</tbody>
    </table>
  </div>
}

function projectCoverage(result: AssignmentResult) {
  const matches = new Map(result.optimal.pairs.map(pair => [pair.column, pair]))
  return result.input.positions.map((position, column) => ({
    position, column, match: matches.get(column),
    candidates: result.input.evaluations.filter(row => row[column].eligible).length,
  }))
}

type PositionOutcome = ReturnType<typeof projectCoverage>[number]

function CoverageChart({ positions, projectId, onSelect }: {
  positions: PositionOutcome[]
  projectId: string
  onSelect: (projectId: string) => void
}) {
  const projects = new Map<string, { name: string; covered: number; total: number }>()
  for (const { position, match } of positions) {
    const { id, name } = position.project
    const project = projects.get(id) ?? { name, covered: 0, total: 0 }
    project.total++
    if (match) project.covered++
    projects.set(id, project)
  }
  const scale = Math.max(1, ...Array.from(projects.values(), project => project.total))

  return <section className="surface dashboard-chart" aria-labelledby="coverage-heading">
    <header className="card-heading"><h2 id="coverage-heading">Cobertura por proyecto</h2><p>Selecciona una barra para filtrar el tablero por proyecto.</p></header>
    <div className="coverage-legend"><span><i className="covered-key" aria-hidden />Cubiertos</span><span><i className="vacant-key" aria-hidden />Vacantes</span></div>
    <ul className="coverage-bars">{[...projects].sort(([, a], [, b]) =>
      (b.total - b.covered) - (a.total - a.covered) || a.name.localeCompare(b.name, 'es'),
    ).map(([id, { name, covered, total }]) => <li key={id}>
      <button type="button" className="coverage-bar" aria-pressed={projectId === id} onClick={() => onSelect(projectId === id ? '' : id)}>
        <span className="coverage-bar-label"><strong>{name}</strong><small>{covered} de {total} puestos cubiertos</small></span>
        <span className="coverage-track" aria-hidden="true">
          <span style={{ width: 100 * covered / scale + '%' }} className="covered-key" />
          <span style={{ width: 100 * (total - covered) / scale + '%' }} className="vacant-key" />
        </span>
      </button>
    </li>)}</ul>
  </section>
}

function BlockersChart({ input, vacancies }: { input: PreparedAssignment; vacancies: PositionOutcome[] }) {
  const counts = new Map<BlockerKey, number>()
  const noCandidates = vacancies.filter(item => item.candidates === 0)
  for (const { column } of noCandidates) {
    for (const row of input.evaluations) {
      const evaluation = row[column]
      if (evaluation.eligible) continue
      for (const key of evaluation.blockers) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const ranked = [...counts].sort(([, a], [, b]) => b - a)
  const totalCrosses = noCandidates.length * input.volunteers.length

  return <section className="surface dashboard-chart" aria-labelledby="blockers-heading">
    <header className="card-heading"><h2 id="blockers-heading">Requisitos que bloquean candidaturas</h2>
      <p>Solo incluye los puestos vacantes sin candidatos elegibles. Un cruce puede aparecer en varias barras.</p>
    </header>
    {ranked.length ? <ul className="blocker-bars">{ranked.map(([key, count]) => <li key={key}>
      <div className="coverage-bar-label"><strong>{blockerLabels[key]}</strong><small>{count} de {totalCrosses} cruces</small></div>
      <div className="coverage-track" aria-hidden="true"><span className="blocker-fill" style={{ width: 100 * count / totalCrosses + '%' }} /></div>
    </li>)}</ul> : <p className="table-empty">No hay vacantes sin candidatos elegibles en esta vista.</p>}
  </section>
}

function DecisionDashboard({ result }: { result: AssignmentResult }) {
  const [projectId, setProjectId] = useState('')
  const [goal, setGoal] = useState('')
  const { input, optimal } = result
  const positions = projectCoverage(result)
  const goals = [...new Set(positions.flatMap(({ position }) => position.project.data.sdgs ?? []))].sort((a, b) => a - b)
  const goalPositions = positions.filter(({ position }) => !goal || position.project.data.sdgs?.includes(Number(goal)))
  const projects = [...new Map(goalPositions.map(({ position }) => [position.project.id, position.project.name])).entries()]
    .sort(([, a], [, b]) => a.localeCompare(b, 'es'))
  const visible = goalPositions.filter(({ position }) => !projectId || position.project.id === projectId)
  const pairs = visible.flatMap(({ match }) => match ? [match] : [])
  const vacancies = visible.filter(item => !item.match).sort((a, b) => a.candidates - b.candidates)
  const noCandidates = vacancies.filter(item => item.candidates === 0).length
  const total = pairs.reduce((sum, pair) => sum + (input.matrix.units[pair.row][pair.column] ?? 0), 0)
  const metrics = [
    { icon: Handshake, value: visible.length ? formatNumber(100 * pairs.length / visible.length) + ' %' : '—', label: 'Cobertura', note: pairs.length + ' de ' + visible.length + ' puestos cubiertos' },
    { icon: ClipboardList, value: vacancies.length, label: 'Puestos vacantes', note: (vacancies.length - noCandidates) + ' con candidatos elegibles' },
    { icon: BriefcaseBusiness, value: noCandidates, label: 'Sin candidatos elegibles', note: 'Vacantes que requieren atención' },
    { icon: ChartNoAxesCombined, value: pairs.length ? formatUnits(total / pairs.length) + ' / 100' : '—', label: 'Compatibilidad media', note: 'Promedio de los puestos cubiertos' },
  ]

  return <div className="container section-layout results-layout">
    <section className="surface dashboard-controls" aria-labelledby="dashboard-heading">
      <header><h2 id="dashboard-heading">Tablero de decisión</h2><p>Filtra la asignación calculada para comparar proyectos y priorizar vacantes.</p></header>
      <div className="dashboard-filters">
        <label className="field"><span>ODS</span><select value={goal} onChange={event => { setGoal(event.target.value); setProjectId('') }}>
          <option value="">Todos los ODS</option>
          {goals.map(id => <option key={id} value={id}>{sdgLabel(id)}</option>)}
        </select></label>
        <label className="field"><span>Proyecto</span><select value={projectId} onChange={event => setProjectId(event.target.value)}>
          <option value="">Todos los proyectos</option>
          {projects.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
        </select></label>
        <button type="button" className="button button-secondary" disabled={!goal && !projectId} onClick={() => { setGoal(''); setProjectId('') }}>Limpiar filtros</button>
      </div>
    </section>
    <div className="metrics-grid" aria-live="polite">{metrics.map(({ icon: Icon, value, label, note }) => <article className="surface metric-card" key={label}>
      <span className="icon-tile"><Icon size={21} aria-hidden /></span><strong>{value}</strong><h2>{label}</h2><p>{note}</p>
    </article>)}</div>
    <div className="dashboard-charts">
      <CoverageChart positions={goalPositions} projectId={projectId} onSelect={setProjectId} />
      <BlockersChart input={input} vacancies={vacancies} />
    </div>
    <section className="surface results-table" aria-labelledby="vacancy-heading">
      <header className="card-heading"><h2 id="vacancy-heading">Vacantes por atender</h2><p>Ordenadas de menor a mayor número de candidatos elegibles.</p></header>
      {vacancies.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="Detalle de vacantes">
        <table className="data-table vacancy-table">
          <thead><tr><th scope="col">Puesto</th><th scope="col">Proyecto</th><th scope="col">Candidatos elegibles</th><th scope="col">Acción sugerida</th></tr></thead>
          <tbody>{vacancies.map(({ position, candidates }) => <tr key={position.id}>
            <th scope="row">{position.name}</th><td>{position.project.name}</td>
            <td>{candidates || 'Sin candidatos elegibles'}</td>
            <td>{candidates ? 'Revisar la selección y los pesos del escenario' : <>
              Convocar perfiles que cumplan los requisitos
              {requiredPositionSkills(position.data).length > 0 && <small className="vacancy-skills">Habilidades obligatorias: {requiredPositionSkills(position.data).join(', ')}</small>}
            </>}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="table-empty">Todos los puestos de esta vista quedaron cubiertos.</p>}
    </section>
    <section className="surface results-table" aria-labelledby="matches-heading">
      <header className="card-heading"><h2 id="matches-heading">Asignaciones óptimas</h2>
        <p>{pairs.length} de {optimal.pairs.length} asignaciones · {formatUnits(total)} puntos en esta vista</p>
        <p>Pesos de la ejecución · {compatibilityCriteria.map(({ key, label }) => label + ' ' + input.weights[key] + ' %').join(' · ')}</p>
      </header>
      <MatchTable input={input} pairs={pairs} />
    </section>
    <details className="surface dashboard-scenario">
      <summary>Ver diagnóstico de la ejecución completa</summary>
      <div className="dashboard-scenario-body">
        <Alert>
          <strong>Cobertura posible por elegibilidad</strong>
          <p>Con los perfiles seleccionados se pueden cubrir hasta {result.maximumEligiblePairs} de {input.positions.length} puestos.
            {optimal.pairs.length < result.maximumEligiblePairs && ' La solución que maximiza el puntaje cubre menos puestos que ese máximo.'}
          </p>
        </Alert>
        <section className="outcome-card"><span className="icon-tile"><UsersRound size={21} aria-hidden /></span><h2>Voluntarios sin asignación ({result.unassignedVolunteers.length})</h2>
          {result.unassignedVolunteers.length ? <ul>{result.unassignedVolunteers.map(person => {
            const row = input.volunteers.findIndex(volunteer => volunteer.id === person.id)
            const eligible = input.evaluations[row].filter(cell => cell.eligible).length
            return <li key={person.id}><strong>{person.name}</strong><span>{eligible === 0 ? 'Sin puestos elegibles' : eligible + (eligible === 1 ? ' puesto elegible' : ' puestos elegibles')}</span></li>
          })}</ul> : <p>Todos los perfiles seleccionados recibieron un puesto.</p>}
        </section>
      </div>
    </details>
  </div>
}

export function Results({ result, onOpen }: { result: AssignmentResult | null; onOpen: (result: AssignmentResult) => void }) {
  const [revision, setRevision] = useState(0)
  return <>
    <PageHeading tag={result ? 'RESULTADOS DE ASIGNACIÓN' : 'RESULTADOS'} title="Resultados de asignación"
      description={result ? 'Compara la cobertura de los proyectos y revisa dónde hacen falta candidatos.' : 'Ejecuta la asignación o abre un archivo guardado para consultar sus resultados.'}
      action={<div className="assignment-actions">
        <AssignmentFileActions result={result} onOpen={opened => {
          onOpen(opened)
          setRevision(current => current + 1)
        }} />
        {result && <a href={pageLink('asignacion')} className="button button-secondary">Volver a la asignación</a>}
      </div>} />
    {result ? <DecisionDashboard key={revision} result={result} />
      : <div className="container section-layout"><EmptyState icon={ChartNoAxesCombined} title="Todavía no hay una asignación" action={<a className="button button-primary" href={pageLink('asignacion')}>Asignar voluntariado <ArrowRight size={16} aria-hidden /></a>}>Selecciona los voluntarios y puestos, genera la matriz y ejecuta la asignación para consultar sus resultados.</EmptyState></div>}
  </>
}

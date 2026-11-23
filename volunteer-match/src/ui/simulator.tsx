import { useRef, useState, type KeyboardEvent } from 'react'
import { ArrowRight, CheckCircle2, ClipboardList, Grid3X3, ListChecks, Play, RotateCcw, SlidersHorizontal, UsersRound } from 'lucide-react'
import { AssignmentService, selectionLimit, type AssignmentResult, type PreparedAssignment } from '../domain/assignment'
import type { SocialProject, Volunteer, VolunteerPosition } from '../domain/catalog'
import { compatibilityCriteria, defaultWeights, optionalSchedule, type ScoreComponents } from '../domain/compatibility'
import { Alert, formatNumber, formatUnits, PageHeading, pageLink } from './shared'
import { AlgorithmStepper } from './stepper'

export interface SimulationState {
  volunteerIds: string[] | null
  positionIds: string[] | null
  weights: Record<keyof ScoreComponents, string>
  prepared: PreparedAssignment | null
  result: AssignmentResult | null
}

export function initialSimulation(): SimulationState {
  return {
    volunteerIds: null, positionIds: null, prepared: null, result: null,
    weights: mapCriteria(key => String(defaultWeights[key])),
  }
}

const service = new AssignmentService()
function mapCriteria<T>(value: (key: keyof ScoreComponents) => T): Record<keyof ScoreComponents, T> {
  return Object.fromEntries(compatibilityCriteria.map(({ key }) => [key, value(key)])) as Record<keyof ScoreComponents, T>
}

function selectedItems<T extends { id: string }>(items: readonly T[], ids: string[] | null): T[] {
  if (ids === null) return items.slice(0, selectionLimit)
  const selected = new Set(ids)
  return items.filter(item => selected.has(item.id))
}

function toggleItems(items: readonly { id: string }[], ids: readonly string[], checked: boolean): string[] {
  const selected = new Set(items.map(item => item.id))
  ids.forEach(id => checked ? selected.add(id) : selected.delete(id))
  return [...selected]
}

const matrixDirections: Record<string, [number, number]> = {
  ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
}

function MatrixPreview({ input }: { input: PreparedAssignment }) {
  const [focus, setFocus] = useState(() => {
    const firstRow = input.evaluations.findIndex(row => row.some(cell => cell.eligible))
    if (firstRow === -1) return { row: 0, column: 0 }
    return { row: firstRow, column: input.evaluations[firstRow].findIndex(cell => cell.eligible) }
  })
  const buttons = useRef<(HTMLButtonElement | null)[][]>([])
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, row: number, column: number) => {
    const direction = matrixDirections[event.key]
    if (!direction) return
    event.preventDefault()
    const nextRow = row + direction[0]
    const nextColumn = column + direction[1]
    const target = buttons.current[nextRow]?.[nextColumn]
    if (target) {
      setFocus({ row: nextRow, column: nextColumn })
      target.focus()
    }
  }
  const selected = input.evaluations[focus.row][focus.column]
  const volunteer = input.volunteers[focus.row]
  const position = input.positions[focus.column]
  const backup = optionalSchedule(position.data)
  return <div className="matrix-preview-grid">
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Matriz de compatibilidad">
      <table className="matrix-table score-matrix">
        <caption className="sr-only">Compatibilidad de voluntarios y puestos. Selecciona una celda para ver el desglose.</caption>
        <thead><tr><th scope="col">Voluntario / puesto</th>{input.positions.map(role => <th scope="col" key={role.id} title={role.project.name + ' · ' + role.name}>{role.name}<span className="matrix-project-name">{role.project.name}</span></th>)}</tr></thead>
        <tbody>{input.volunteers.map((person, row) => <tr key={person.id}>
          <th scope="row">{person.name}</th>
          {input.evaluations[row].map((evaluation, column) => {
            const isSelected = row === focus.row && column === focus.column
            return <td key={input.positions[column].id} className={evaluation.eligible ? '' : 'forbidden'}>
              <button type="button"
                className={isSelected ? 'selected-score' : ''}
                ref={element => { (buttons.current[row] ??= [])[column] = element }}
                aria-pressed={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onKeyDown={event => navigate(event, row, column)}
                aria-label={person.name + ' · ' + input.positions[column].name + ' (' + input.positions[column].project.name + ') · ' + (evaluation.eligible ? formatNumber(evaluation.score) + ' puntos' : 'Prohibido')}
                onClick={() => setFocus({ row, column })}
              >{evaluation.eligible ? formatNumber(evaluation.score) : '×'}</button>
            </td>
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <aside className="pair-detail" aria-label="Detalle del cruce seleccionado" aria-live="polite">
      <p className="micro-label">CRUCE SELECCIONADO</p>
      <h3>{volunteer.name}</h3><p>{position.name} · {position.project.name}</p>
      {selected.eligible ? <>
        <strong className="pair-score">{formatNumber(selected.score)} <small>/ 100</small></strong>
        <dl className="score-breakdown">{compatibilityCriteria.map(({ key, label }) => <div key={key}>
          <dt>{label} <small>({input.weights[key]} %)</small></dt><dd>{formatNumber(selected.components[key] * input.weights[key] / 100)} pts</dd>
        </div>)}</dl>
        <p><strong>Habilidades que coinciden</strong><br />{selected.matchedSkills.join(', ') || 'Ninguna registrada para este cruce'}</p>
        <p><strong>Nivel de experiencia relevante</strong> {selected.relevantExperience} de 5</p>
        <p><strong>Bloques de respaldo cubiertos</strong><br />{backup.length
          ? backup.filter(slot => volunteer.data.availability.includes(slot)).length + ' de ' + backup.length
          : 'El puesto no pide bloques de respaldo'}</p>
        <p><strong>Ubicación</strong> {position.project.data.location}<br />Zonas preferidas: {volunteer.data.preferredLocations?.join(', ') || 'Cualquier zona'}</p>
      </> : <div className="blocked-detail"><strong>Asignación prohibida</strong><ul>{selected.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
    </aside>
  </div>
}

export function Simulator({ volunteers, projects, state, update, onRestore }: {
  volunteers: readonly Volunteer[]; projects: readonly SocialProject[];
  state: SimulationState; update: (next: SimulationState) => void; onRestore: () => void;
}) {
  const [error, setError] = useState('')
  const matrixHeading = useRef<HTMLHeadingElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const available = volunteers.filter(volunteer => volunteer.data.active)
  const projectPositions = projects.map(project => ({
    project, positions: project.positions.filter(position => position.data.active),
  })).filter(group => group.positions.length > 0)
  const open = projectPositions.flatMap(group => group.positions)
  const people = selectedItems(available, state.volunteerIds)
  const roles = selectedItems(open, state.positionIds)
  const weightTotal = Object.values(state.weights).reduce((sum, weight) => sum + Number(weight), 0)

  const edit = (patch: Partial<Pick<SimulationState, 'volunteerIds' | 'positionIds' | 'weights'>>) => {
    setError('')
    update({ ...state, ...patch, prepared: null, result: null })
  }

  const prepare = () => {
    try {
      if (!people.length || !roles.length) throw new Error('Selecciona al menos un voluntario activo y un puesto abierto.')
      const weights = mapCriteria(key => state.weights[key] === '' ? NaN : Number(state.weights[key]))
      const prepared = service.prepare(people, roles, weights)
      update({ ...state, prepared, result: null })
      setError('')
      window.requestAnimationFrame(() => matrixHeading.current?.focus())
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo generar la matriz.')
    }
  }

  const solve = () => {
    if (!state.prepared) return
    try {
      update({ ...state, result: service.solve(state.prepared) })
      setError('')
      window.requestAnimationFrame(() => resultHeading.current?.focus())
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo ejecutar el algoritmo.')
    }
  }

  return <>
    <PageHeading tag="GESTIÓN DE ASIGNACIONES" title="Asignación de voluntariado" description="Selecciona personas y puestos, revisa su compatibilidad y encuentra la asignación que mejor aprovecha las habilidades disponibles." action={
      <div className="assignment-actions">
        <button type="button" className="button button-secondary" onClick={() => {
          update({ ...initialSimulation(), volunteerIds: [], positionIds: [] })
          setError('')
        }}>Limpiar</button>
        <button type="button" className="button button-secondary" onClick={onRestore}><RotateCcw size={16} aria-hidden /> Restaurar demostración</button>
      </div>
    } />
    <div className="container section-layout simulator">
      <ol className="sim-progress" aria-label="Etapas de la asignación">
        <li className="current"><span>01</span> Selección</li>
        <li className={state.prepared ? 'current' : ''}><span>02</span> Matriz</li>
        <li className={state.result ? 'current' : ''}><span>03</span> Resolución</li>
      </ol>
      <section className="sim-section" aria-labelledby="select-heading">
        <div className="section-top"><div><h2 id="select-heading">Define el escenario</h2><p>Selecciona hasta {selectionLimit} voluntarios activos y {selectionLimit} puestos abiertos por ejecución.</p></div></div>
        <div className="selection-grid">
          <section className="surface selection-panel" aria-label="Selección de voluntarios">
            <header><span className="icon-tile"><UsersRound size={20} aria-hidden /></span><div><h3>Voluntarios</h3><p>{people.length} de {available.length} seleccionados</p></div>
              <button type="button" className="button button-quiet" onClick={() => edit({
                volunteerIds: people.length ? [] : available.slice(0, selectionLimit).map(person => person.id),
              })} disabled={!available.length}>{people.length ? 'Quitar todos' : 'Seleccionar todos'}</button>
            </header>
            <div className="selection-list">
              {available.length ? available.map(volunteer => <label className="selection-option" key={volunteer.id}>
                <input type="checkbox" checked={people.some(person => person.id === volunteer.id)} onChange={event => edit({ volunteerIds: toggleItems(people, [volunteer.id], event.target.checked) })} />
                <span>{volunteer.name}</span><small>{volunteer.data.availability.length} bloques</small>
              </label>) : <p className="selection-empty">Registra un perfil activo en <a href={pageLink('voluntarios')}>Voluntarios</a>.</p>}
            </div>
          </section>
          <section className="surface selection-panel" aria-label="Selección de proyectos y puestos">
            <header><span className="icon-tile"><ClipboardList size={20} aria-hidden /></span><div><h3>Proyectos y puestos</h3><p>{roles.length} de {open.length} seleccionados</p></div>
              <button type="button" className="button button-quiet" onClick={() => edit({
                positionIds: roles.length ? [] : open.slice(0, selectionLimit).map(role => role.id),
              })} disabled={!open.length}>{roles.length ? 'Quitar todos' : 'Seleccionar todos'}</button>
            </header>
            <div className="selection-list">
              {projectPositions.length ? projectPositions.map(({ project, positions }) => {
                const selected = positions.filter(position => roles.some(role => role.id === position.id)).length
                return <fieldset className="project-selection" key={project.id}>
                  <legend className="sr-only">{project.name}</legend>
                  <label className="selection-option project-toggle">
                    <input type="checkbox" checked={selected === positions.length} aria-label={'Incluir proyecto ' + project.name} onChange={event => edit({
                      positionIds: toggleItems(roles, positions.map(position => position.id), event.target.checked),
                    })} />
                    <span>{project.name}</span><small>{selected} / {positions.length}</small>
                  </label>
                  {positions.map((position: VolunteerPosition) => <label key={position.id} className="selection-option role-toggle">
                    <input type="checkbox" checked={roles.some(role => role.id === position.id)} onChange={event => edit({ positionIds: toggleItems(roles, [position.id], event.target.checked) })} />
                    <span>{position.name}</span>
                  </label>)}
                </fieldset>
              }) : <p className="selection-empty">Crea un puesto abierto en <a href={pageLink('proyectos')}>Proyectos</a>.</p>}
            </div>
          </section>
        </div>
        <section className="surface weights-panel" aria-labelledby="weights-heading">
          <div className="weight-title"><span className="icon-tile"><SlidersHorizontal size={20} aria-hidden /></span><div><h3 id="weights-heading">Pesos de compatibilidad</h3><p>Las restricciones obligatorias se aplican antes de puntuar.</p></div></div>
          <div className="weight-fields">
            {compatibilityCriteria.map(({ key, label }) => <label className="field" key={key}><span>{label}</span><span className="weight-input">
              <input type="number" min={0} max={100} step={1} value={state.weights[key]} onChange={event => edit({ weights: { ...state.weights, [key]: event.target.value } })} />
              <span aria-hidden="true">%</span></span></label>)}
            <span className={'weight-sum ' + (weightTotal === 100 ? 'valid' : '')}>Total <strong>{formatNumber(weightTotal)} %</strong></span>
          </div>
          <div className="panel-action">
            <a className="text-link" href={pageLink('teoria')}>Ver cómo se puntúa <ArrowRight size={15} aria-hidden /></a>
            <button type="button" className="button button-primary" onClick={prepare}><Grid3X3 size={17} aria-hidden /> Generar matriz</button>
          </div>
        </section>
        {error && <Alert kind="error">{error}</Alert>}
      </section>

      {state.prepared && <section className="sim-section surface matrix-panel">
        <header className="matrix-panel-heading"><div>
          <p className="eyebrow"><span /> 02 / COMPATIBILIDAD</p>
          <h2 ref={matrixHeading} tabIndex={-1}>Matriz de compatibilidad</h2>
          <p>{state.prepared.volunteers.length} × {state.prepared.positions.length} cruces. Selecciona una celda para ver su detalle o usa las flechas del teclado para recorrer la matriz.</p>
        </div><button type="button" className="button button-primary" onClick={solve}><Play size={17} aria-hidden /> Ejecutar algoritmo</button></header>
        <MatrixPreview key={JSON.stringify([state.prepared.volunteers.map(person => person.id), state.prepared.positions.map(role => role.id), state.prepared.weights])} input={state.prepared} />
      </section>}

      {state.prepared && state.result && <section className="sim-section resolution-section">
        <header className="resolution-banner">
          <span className="icon-tile"><CheckCircle2 size={23} aria-hidden /></span>
          <div><h2 ref={resultHeading} tabIndex={-1}>Asignación calculada</h2><p>{state.result.optimal.pairs.length} pares reales · {formatUnits(state.result.optimal.totalUnits)} puntos de compatibilidad</p></div>
          <a className="button button-primary" href={pageLink('resultados')}><ListChecks size={17} aria-hidden /> Ver resultados <ArrowRight size={16} aria-hidden /></a>
        </header>
        <AlgorithmStepper steps={state.result.optimal.steps} rowLabels={state.result.input.volunteers.map(volunteer => volunteer.name)} columnLabels={state.result.input.positions.map(position => position.name)} />
      </section>}
    </div>
  </>
}

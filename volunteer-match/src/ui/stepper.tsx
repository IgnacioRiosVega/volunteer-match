import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Grid3X3, Pause, Play, RotateCcw } from 'lucide-react'
import type { AlgorithmStep, Stage } from '../domain/hungarian'
import { formatUnits } from './shared'

const labels: Record<Stage, string> = {
  original: 'Matriz original',
  balanced: 'Matriz con filas y columnas ficticias',
  costs: 'Conversión de beneficios a costos',
  rows: 'Reducción por filas',
  columns: 'Reducción por columnas',
  cover: 'Cobertura mínima de ceros',
  adjust: 'Ajuste de la matriz',
  final: 'Ceros independientes en la matriz final',
  result: 'Resultado óptimo',
}

function explanation(step: AlgorithmStep, realRows: number, realColumns: number): string {
  switch (step.stage) {
    case 'original': return 'Cada celda contiene el beneficio de asignar un voluntario a un puesto. El símbolo × identifica los cruces prohibidos.'
    case 'balanced': return 'Se añadieron ' + realColumns + ' filas y ' + realRows + ' columnas ficticias con beneficio cero. Permiten representar tanto puestos vacantes como voluntarios sin asignación.'
    case 'costs': return 'Cada beneficio permitido se resta de ' + formatUnits(step.value ?? 0) + ', el mayor de la matriz. Minimizar los costos resultantes equivale a maximizar los beneficios.'
    case 'rows': return 'Se restó el menor costo permitido de cada fila a todas sus celdas elegibles. Las celdas bloqueadas conservan su estado.'
    case 'columns': return 'A partir de la reducción anterior, se restó de cada columna su menor costo permitido.'
    case 'cover': {
      const count = (step.coveredRows?.length ?? 0) + (step.coveredColumns?.length ?? 0)
      return 'Se necesitan ' + count + ' líneas para cubrir los ceros. ' + (count === step.cells.length
        ? 'Ya existe una selección completa de ceros independientes.'
        : 'Se requiere otro ajuste para obtener más ceros independientes.')
    }
    case 'adjust': return 'Se restó ' + formatUnits(step.value ?? 0) + ', el menor costo descubierto, de las celdas sin línea. En las celdas cubiertas dos veces se sumó ese mismo valor.'
    case 'final': return 'Las marcas indican los ceros elegidos. Cada fila y cada columna de la matriz final participa exactamente una vez.'
    case 'result': return 'La suma de los beneficios originales de los pares reales es ' + formatUnits(step.value ?? 0) + ' puntos. Los pares ficticios ya se retiraron.'
  }
}

export function AlgorithmStepper({ steps, rowLabels, columnLabels }: {
  steps: readonly AlgorithmStep[]
  rowLabels: readonly string[]
  columnLabels: readonly string[]
}) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const last = steps.length - 1

  useEffect(() => {
    if (!playing || index >= last) return
    const timer = window.setTimeout(() => setIndex(current => current + 1), 1000)
    return () => window.clearTimeout(timer)
  }, [index, last, playing])

  if (!steps.length) return null
  const current = steps[Math.min(index, last)]
  const isPlaying = playing && index < last
  const move = (target: number) => {
    setPlaying(false)
    setIndex(target)
  }
  const togglePlay = () => {
    if (isPlaying) {
      setPlaying(false)
    } else {
      if (index >= last) setIndex(0)
      setPlaying(true)
    }
  }
  const picked = new Set(current.pairs?.map(({ row, column }) => row + '-' + column))
  const rows = new Set(current.coveredRows)
  const columns = new Set(current.coveredColumns)
  const colCount = current.cells[0]?.length ?? 0
  const hasDummies = current.cells.length > rowLabels.length || colCount > columnLabels.length
  const rowLabel = (row: number) => rowLabels[row] ?? 'Ficticia F' + (row + 1 - rowLabels.length)
  const columnLabel = (column: number) => columnLabels[column] ?? 'Ficticia C' + (column + 1 - columnLabels.length)

  return <section className="stepper surface" aria-label="Visualización paso a paso">
    <div className="stepper-top">
      <span className="icon-tile"><Grid3X3 size={22} aria-hidden /></span>
      <div className="stepper-headings" aria-live="polite" aria-atomic="true">
        <p className="micro-label">PASO {index + 1} DE {steps.length}</p>
        <h2>{labels[current.stage]}</h2>
      </div>
      <div className="step-progress" aria-hidden="true">
        {steps.length <= 16
          ? steps.map((step, target) => <span key={step.stage + target} className={target <= index ? 'done' : ''} />)
          : <progress max={steps.length} value={index + 1} />}
      </div>
    </div>
    <div className="stepper-body">
      <p>{explanation(current, rowLabels.length, columnLabels.length)}</p>
      {current.minima && <details className="minima">
        <summary>Ver mínimos aplicados</summary>
        <dl>{current.minima.map((min, position) => <div key={position}>
          <dt>{current.stage === 'rows' ? rowLabel(position) : columnLabel(position)}</dt>
          <dd>{Number.isFinite(min) ? formatUnits(min) : '—'}</dd>
        </div>)}</dl>
      </details>}
      <div className="table-scroll" tabIndex={0} role="region" aria-label={labels[current.stage]}>
        <table className="matrix-table step-matrix">
          <caption className="sr-only">{labels[current.stage]}</caption>
          <thead><tr><th scope="col">Voluntario / puesto</th>{Array.from({ length: colCount }, (_, column) => <th
            key={column} scope="col" title={columnLabel(column)}
            className={(column >= columnLabels.length ? ' fictitious' : '') + (columns.has(column) ? ' col-line' : '')}
          >{columnLabel(column)}</th>)}</tr></thead>
          <tbody>{current.cells.map((row, rowIndex) => <tr key={rowIndex}>
            <th scope="row" className={(rowIndex >= rowLabels.length ? ' fictitious' : '') + (rows.has(rowIndex) ? ' row-line' : '')}>{rowLabel(rowIndex)}</th>
            {row.map((cell, column) => {
              const selected = picked.has(rowIndex + '-' + column)
              const crossedRow = rows.has(rowIndex)
              const crossedColumn = columns.has(column)
              const classes = [
                cell === null ? 'forbidden' : cell === 0 ? 'zero' : '',
                selected ? 'picked' : '', crossedRow ? 'row-line' : '', crossedColumn ? 'col-line' : '',
                rowIndex >= rowLabels.length || column >= columnLabels.length ? 'fictitious' : '',
              ].filter(Boolean).join(' ')
              return <td key={column} className={classes} aria-label={
                (cell === null ? 'Prohibido' : formatUnits(cell))
                + (selected ? ', seleccionado' : '')
                + (crossedRow ? ', línea horizontal' : '')
                + (crossedColumn ? ', línea vertical' : '')
              }>{selected && <span className="selected-symbol" aria-hidden>● </span>}{cell === null ? '×' : formatUnits(cell)}</td>
            })}
          </tr>)}</tbody>
        </table>
      </div>
      <div className="matrix-key"><span><b>×</b> Prohibido</span><span><b className="key-selected">●</b> Seleccionado</span>
        {(rows.size > 0 || columns.size > 0) && <span><b className="key-line">―</b> Línea de cobertura</span>}
        {hasDummies && <span><b>F / C</b> Elemento ficticio</span>}
      </div>
    </div>
    <div className="stepper-controls">
      <div>
        <button type="button" className="button button-secondary" onClick={() => move(index - 1)} disabled={index === 0}><ArrowLeft size={16} aria-hidden /> Paso anterior</button>
        <button type="button" className="button button-primary" onClick={() => move(index + 1)} disabled={index >= last}>Siguiente paso <ArrowRight size={16} aria-hidden /></button>
      </div>
      <div>
        <button type="button" className="button button-quiet" onClick={() => move(0)}><RotateCcw size={16} aria-hidden /> Reiniciar</button>
        <button type="button" className="button button-quiet" onClick={togglePlay}>{isPlaying ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}{isPlaying ? 'Pausar' : 'Resolver automáticamente'}</button>
      </div>
    </div>
  </section>
}

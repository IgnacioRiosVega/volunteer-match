import { AssignmentMatrix, BipartiteMatching, type Cell, type Matrix, type Pair } from './matrix'

export type Stage = 'original' | 'balanced' | 'costs' | 'rows' | 'columns' | 'cover' | 'adjust' | 'final' | 'result'
export interface AlgorithmStep {
  stage: Stage
  /** Values use integer hundredths, and null marks a forbidden edge. */
  cells: Matrix
  value?: number
  minima?: readonly number[]
  pairs?: readonly Pair[]
  coveredRows?: readonly number[]
  coveredColumns?: readonly number[]
}

export interface HungarianSolution {
  feasible: boolean
  pairs: readonly Pair[]
  totalUnits: number
  steps: readonly AlgorithmStep[]
}

const smallest = (cells: ReadonlyArray<Cell>) =>
  cells.reduce<number>((min, cell) => cell === null ? min : Math.min(min, cell), Infinity)

export class HungarianAlgorithm {
  solve(matrix: AssignmentMatrix, options: { trace?: boolean; complete?: boolean } = {}): HungarianSolution {
    const steps: AlgorithmStep[] = []
    const record = (stage: Stage, cells: Matrix, metadata: Omit<AlgorithmStep, 'stage' | 'cells'> = {}) => {
      if (options.trace) steps.push({ stage, cells, ...metadata })
    }
    if (options.complete && matrix.rowCount !== matrix.columnCount) {
      throw new Error('El modo de asignación completa requiere una matriz cuadrada.')
    }

    record('original', matrix.units)
    const benefits = options.complete ? matrix.units : matrix.withVacancies()
    const size = benefits.length
    if (!options.complete) record('balanced', benefits)
    const base = benefits.reduce((max, row) => row.reduce<number>((current, cell) =>
      cell === null ? current : Math.max(current, cell), max), 0)
    const costs = benefits.map(row => row.map(cell => cell === null ? null : base - cell))
    record('costs', costs, { value: base })

    const rowMinima = costs.map(smallest)
    const byRows = costs.map((row, index) => row.map(cell => cell === null ? null : cell - rowMinima[index]))
    record('rows', byRows, { minima: rowMinima })

    const columnMinima = Array.from({ length: size }, (_, column) => smallest(byRows.map(row => row[column])))
    let reduced = byRows.map(row => row.map((cell, column) => cell === null ? null : cell - columnMinima[column]))
    record('columns', reduced, { minima: columnMinima })

    const matching = new BipartiteMatching(size, size)
    let matched = 0
    while (matched < size) {
      const cover = matching.augment((row, column) => reduced[row][column] === 0)
      if (cover.augmented) {
        matched++
        continue
      }

      record('cover', reduced, { coveredRows: cover.coveredRows, coveredColumns: cover.coveredColumns, pairs: matching.pairs })
      const rows = new Set(cover.coveredRows)
      const columns = new Set(cover.coveredColumns)
      let adjustment = Infinity
      reduced.forEach((row, rowIndex) => {
        if (rows.has(rowIndex)) return
        row.forEach((cell, column) => {
          if (cell !== null && !columns.has(column)) adjustment = Math.min(adjustment, cell)
        })
      })
      // The same cover then blocks every eligible edge, so a perfect matching is impossible.
      if (!Number.isFinite(adjustment)) return { feasible: false, pairs: [], totalUnits: 0, steps }

      reduced = reduced.map((row, rowIndex) => row.map((cell, column) => {
        if (cell === null) return null
        const coverage = Number(rows.has(rowIndex)) + Number(columns.has(column))
        return cell + (coverage - 1) * adjustment
      }))
      record('adjust', reduced, { value: adjustment, coveredRows: cover.coveredRows, coveredColumns: cover.coveredColumns })
    }

    const fullPairs = matching.pairs
    // With n independent zeros, n lines are necessary and covering every row suffices.
    record('cover', reduced, {
      coveredRows: Array.from({ length: size }, (_, row) => row), coveredColumns: [], pairs: fullPairs,
    })
    record('final', reduced, { pairs: fullPairs })
    const pairs = fullPairs.filter(({ row, column }) => row < matrix.rowCount && column < matrix.columnCount)
    const totalUnits = pairs.reduce((sum, { row, column }) => {
      const score = matrix.units[row][column]
      if (score === null) throw new Error('Se detectó una asignación prohibida.')
      return sum + score
    }, 0)
    record('result', matrix.units, { pairs, value: totalUnits })
    return { feasible: true, pairs, totalUnits, steps }
  }
}

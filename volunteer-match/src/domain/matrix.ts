export type Cell = number | null
export type Matrix = ReadonlyArray<ReadonlyArray<Cell>>
export type Pair = { row: number; column: number }

export class AssignmentMatrix {
  readonly rowCount: number
  readonly columnCount: number
  readonly units: Matrix

  constructor(scores: Matrix, columnCount = scores[0]?.length ?? 0) {
    if (!Number.isSafeInteger(columnCount) || columnCount < 0) throw new Error('Cantidad de columnas inválida.')
    this.rowCount = scores.length
    this.columnCount = columnCount
    this.units = scores.map(row => {
      if (row.length !== columnCount) throw new Error('Todas las filas deben tener la misma cantidad de columnas.')
      return Array.from(row, score => {
        if (score === null) return null
        const units = Math.round(score * 100)
        if (!Number.isFinite(score) || score < 0 || score > 100 || Math.abs(score * 100 - units) > 1e-8) {
          throw new Error('Cada beneficio debe estar entre 0 y 100 y tener hasta dos decimales.')
        }
        return units
      })
    })
  }

  // Any real partial matching can be completed using private capacity on both sides.
  withVacancies(): Cell[][] {
    const size = this.rowCount + this.columnCount
    return Array.from({ length: size }, (_, row) =>
      Array.from({ length: size }, (_, column) =>
        row < this.rowCount && column < this.columnCount ? this.units[row][column] : 0,
      ),
    )
  }
}

export class BipartiteMatching {
  private readonly columnByRow: number[]
  private readonly rowByColumn: number[]

  constructor(rows: number, columns: number) {
    this.columnByRow = Array<number>(rows).fill(-1)
    this.rowByColumn = Array<number>(columns).fill(-1)
  }

  get pairs(): Pair[] {
    return this.columnByRow.flatMap((column, row) => column < 0 ? [] : [{ row, column }])
  }

  augment(allowed: (row: number, column: number) => boolean) {
    const queue: number[] = []
    const reachedRows = this.columnByRow.map((column, row) => {
      if (column !== -1) return false
      queue.push(row)
      return true
    })
    const parentByColumn = this.rowByColumn.map(() => -1)

    for (let head = 0; head < queue.length; head++) {
      const row = queue[head]
      for (let column = 0; column < this.rowByColumn.length; column++) {
        if (parentByColumn[column] !== -1 || this.columnByRow[row] === column || !allowed(row, column)) continue
        parentByColumn[column] = row
        const nextRow = this.rowByColumn[column]
        if (nextRow === -1) {
          this.flipPath(column, parentByColumn)
          return { augmented: true } as const
        }
        if (!reachedRows[nextRow]) {
          reachedRows[nextRow] = true
          queue.push(nextRow)
        }
      }
    }

    // König's theorem: rows outside the forest and columns inside it cover all edges.
    return {
      augmented: false,
      coveredRows: reachedRows.flatMap((reached, row) => reached ? [] : [row]),
      coveredColumns: parentByColumn.flatMap((parent, column) => parent < 0 ? [] : [column]),
    } as const
  }

  private flipPath(freeColumn: number, parentByColumn: number[]) {
    let column = freeColumn
    while (column !== -1) {
      const row = parentByColumn[column]
      const previous = this.columnByRow[row]
      this.columnByRow[row] = column
      this.rowByColumn[column] = row
      column = previous
    }
  }
}

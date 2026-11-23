import { CompatibilityCalculator, type Compatibility, type ScoreComponents, type Weights } from './compatibility'
import type { Volunteer, VolunteerPosition } from './catalog'
import { HungarianAlgorithm, type HungarianSolution } from './hungarian'
import { AssignmentMatrix, BipartiteMatching, type Pair } from './matrix'

export const selectionLimit = 25

export interface PreparedAssignment {
  volunteers: readonly Volunteer[]
  positions: readonly VolunteerPosition[]
  weights: Readonly<ScoreComponents>
  evaluations: ReadonlyArray<ReadonlyArray<Compatibility>>
  matrix: AssignmentMatrix
}

export class AssignmentResult {
  readonly unassignedVolunteers: readonly Volunteer[]
  readonly vacantPositions: readonly VolunteerPosition[]

  constructor(
    readonly input: PreparedAssignment,
    readonly optimal: HungarianSolution,
    readonly alternative: { pairs: readonly Pair[]; totalUnits: number },
    readonly maximumEligiblePairs: number,
  ) {
    const matchedRows = new Set(optimal.pairs.map(pair => pair.row))
    const matchedColumns = new Set(optimal.pairs.map(pair => pair.column))
    this.unassignedVolunteers = input.volunteers.filter((_, row) => !matchedRows.has(row))
    this.vacantPositions = input.positions.filter((_, column) => !matchedColumns.has(column))
  }

  get improvementUnits() { return this.optimal.totalUnits - this.alternative.totalUnits }
  get improvementPercent() {
    return this.alternative.totalUnits > 0 ? 100 * this.improvementUnits / this.alternative.totalUnits : null
  }
  get allPositionsFeasible() { return this.maximumEligiblePairs === this.input.positions.length }
  get smallerSideFeasible() {
    return this.maximumEligiblePairs === Math.min(this.input.volunteers.length, this.input.positions.length)
  }
}

export class AssignmentService {
  constructor(private readonly algorithm = new HungarianAlgorithm()) {}

  prepare(volunteers: readonly Volunteer[], positions: readonly VolunteerPosition[], weights: Weights): PreparedAssignment {
    if (volunteers.length > selectionLimit || positions.length > selectionLimit) {
      throw new Error('Selecciona hasta ' + selectionLimit + ' voluntarios y ' + selectionLimit + ' puestos por ejecución.')
    }
    if (new Set(volunteers.map(volunteer => volunteer.id)).size !== volunteers.length
      || new Set(positions.map(position => position.id)).size !== positions.length) {
      throw new Error('Cada voluntario y cada puesto deben seleccionarse una sola vez.')
    }
    const calculator = new CompatibilityCalculator(weights)
    const evaluations = volunteers.map(volunteer => positions.map(position => calculator.evaluate(volunteer, position)))
    const matrix = new AssignmentMatrix(evaluations.map(row => row.map(cell => cell.eligible ? cell.score : null)), positions.length)
    return { volunteers, positions, weights: calculator.weights, evaluations, matrix }
  }

  solve(input: PreparedAssignment): AssignmentResult {
    const { matrix } = input
    const optimum = this.algorithm.solve(matrix, { trace: true })
    if (!optimum.feasible) throw new Error('No se pudo completar el modelo de asignación opcional.')

    const eligible = new BipartiteMatching(matrix.rowCount, matrix.columnCount)
    let maximumEligiblePairs = 0
    while (eligible.augment((row, column) => matrix.units[row][column] !== null).augmented) maximumEligiblePairs++

    return new AssignmentResult(input, optimum, this.greedy(matrix), maximumEligiblePairs)
  }

  private greedy(matrix: AssignmentMatrix) {
    const candidates = matrix.units.flatMap((scores, row) =>
      scores.flatMap((units, column) => units === null ? [] : [{ row, column, units }]),
    )
    candidates.sort((a, b) => b.units - a.units || a.row - b.row || a.column - b.column)
    const rows = new Set<number>()
    const columns = new Set<number>()
    const pairs: Pair[] = []
    let totalUnits = 0
    for (const { row, column, units } of candidates) {
      if (rows.has(row) || columns.has(column)) continue
      rows.add(row)
      columns.add(column)
      pairs.push({ row, column })
      totalUnits += units
    }
    return { pairs, totalUnits }
  }
}

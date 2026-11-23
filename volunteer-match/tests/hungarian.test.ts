import { describe, expect, it } from 'vitest'
import { HungarianAlgorithm } from '../src/domain/hungarian'
import { AssignmentMatrix, type Matrix } from '../src/domain/matrix'

const algorithm = new HungarianAlgorithm()

// Independent oracle: enumerate partial assignments directly on the original matrix.
function exhaustive(matrix: AssignmentMatrix): number {
  function search(row: number, used: Set<number>): number {
    if (row === matrix.rowCount) return 0
    let best = search(row + 1, used)
    matrix.units[row].forEach((score, column) => {
      if (score === null || used.has(column)) return
      used.add(column)
      best = Math.max(best, score + search(row + 1, used))
      used.delete(column)
    })
    return best
  }
  return search(0, new Set())
}

function verifyPairs(matrix: AssignmentMatrix, expected: number) {
  const { feasible, pairs, totalUnits } = algorithm.solve(matrix)
  expect(feasible).toBe(true)
  expect(totalUnits).toBe(expected)
  expect(new Set(pairs.map(pair => pair.row)).size).toBe(pairs.length)
  expect(new Set(pairs.map(pair => pair.column)).size).toBe(pairs.length)
  expect(pairs.reduce((sum, { row, column }) => {
    expect(row).toBeLessThan(matrix.rowCount)
    expect(column).toBeLessThan(matrix.columnCount)
    const score = matrix.units[row][column]
    expect(score).not.toBeNull()
    return sum + (score ?? 0)
  }, 0)).toBe(totalUnits)
}

describe('Algoritmo húngaro', () => {
  it.each<{ label: string; scores: Matrix; expected: number }>([
    { label: 'cuadrada', scores: [[12, 9, 8], [9, 2, 5], [6, 4, 12]], expected: 3000 },
    { label: 'rectangular con más puestos', scores: [[9, 2, 7], [8, 10, 1]], expected: 1900 },
    { label: 'rectangular con más voluntarios', scores: [[9, 8], [2, 10], [7, 1]], expected: 1900 },
    { label: 'de un elemento', scores: [[78.35]], expected: 7835 },
    { label: 'con múltiples soluciones óptimas', scores: [[0, 10], [0, 10]], expected: 1000 },
    { label: 'con todos los valores repetidos', scores: [[32, 32, 32], [32, 32, 32]], expected: 6400 },
    { label: 'con cruces prohibidos', scores: [[null, 90], [90, null]], expected: 18000 },
    { label: 'con fila y columna sin candidatos', scores: [[null, null], [null, 45]], expected: 4500 },
    { label: 'totalmente prohibida', scores: [[null, null], [null, null]], expected: 0 },
    { label: 'con centésimas exactas', scores: [[0.01, 0.05], [0.02, 0.03]], expected: 7 },
  ])('optimiza una matriz $label', ({ scores, expected }) => {
    verifyPairs(new AssignmentMatrix(scores), expected)
  })

  it('admite ambos lados vacíos, sin puestos o sin voluntarios', () => {
    for (const matrix of [new AssignmentMatrix([]), new AssignmentMatrix([], 2), new AssignmentMatrix([[], []])]) {
      verifyPairs(matrix, 0)
      expect(algorithm.solve(matrix).pairs).toEqual([])
    }
  })

  it('valida forma, dimensiones, valores y precisión', () => {
    expect(() => new AssignmentMatrix([[1], [2, 3]])).toThrow(/filas/)
    expect(() => new AssignmentMatrix([], -1)).toThrow(/columnas/)
    for (const value of [-1, 101, 1.001, NaN, Infinity]) {
      expect(() => new AssignmentMatrix([[value]])).toThrow(/beneficio/)
    }
    expect(() => algorithm.solve(new AssignmentMatrix([[1, 2]]), { complete: true })).toThrow(/cuadrada/)
  })

  it('puede preferir un beneficio mayor aunque la cobertura completa sea factible', () => {
    const matrix = new AssignmentMatrix([[100, 1], [1, null]])
    const optional = algorithm.solve(matrix)
    const complete = algorithm.solve(matrix, { complete: true })
    expect(optional.pairs).toEqual([{ row: 0, column: 0 }])
    expect(optional.totalUnits).toBe(10000)
    expect(complete.totalUnits).toBe(200)
  })

  it('identifica una asignación completa infactible aunque cada fila tenga un cruce permitido', () => {
    const matrix = new AssignmentMatrix([[15, null, null], [10, null, null], [null, 8, 7]])
    expect(algorithm.solve(matrix, { complete: true, trace: true }).feasible).toBe(false)
    verifyPairs(matrix, 2300)
  })

  it('refleja la conversión, los mínimos, la cobertura y el ajuste del ejercicio', () => {
    const solution = algorithm.solve(new AssignmentMatrix([[60, 90, 70], [80, 100, 50], [70, 80, 80]]), { complete: true, trace: true })
    const { steps } = solution
    expect(steps.map(step => step.stage)).toEqual(['original', 'costs', 'rows', 'columns', 'cover', 'adjust', 'cover', 'final', 'result'])
    expect(steps[1].value).toBe(10000)
    expect(steps[1].cells).toEqual([[4000, 1000, 3000], [2000, 0, 5000], [3000, 2000, 2000]])
    expect(steps[2].minima).toEqual([1000, 0, 2000])
    expect(steps[3].minima).toEqual([1000, 0, 0])
    expect(steps[4].coveredRows).toEqual([2])
    expect(steps[4].coveredColumns).toEqual([1])
    expect(steps[5].value).toBe(1000)
    expect(solution.pairs).toEqual([{ row: 0, column: 1 }, { row: 1, column: 0 }, { row: 2, column: 2 }])
    expect(solution.totalUnits).toBe(25000)
  })

  it('conserva las prohibiciones al balancear y transformar', () => {
    const { steps } = algorithm.solve(new AssignmentMatrix([[60, null]]), { trace: true })
    expect(steps[1].cells).toEqual([[6000, null, 0], [0, 0, 0], [0, 0, 0]])
    expect(steps[2].cells).toEqual([[0, null, 6000], [6000, 6000, 6000], [6000, 6000, 6000]])
    expect(steps.every(step => step.cells[0][1] === null)).toBe(true)
  })

  it('coincide con enumeración exhaustiva en 512 matrices pequeñas reproducibles', () => {
    let seed = 48
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed
    }
    for (let run = 0; run < 512; run++) {
      const rows = next() >>> 16
      const columns = (next() >>> 16) % 6
      const values = Array.from({ length: rows % 6 }, () => Array.from({ length: columns }, () => {
        const value = next() >>> 16
        return value % 4 === 0 ? null : (value % 10001) / 100
      }))
      const matrix = new AssignmentMatrix(values, columns)
      verifyPairs(matrix, exhaustive(matrix))
    }
  })

  it('alcanza la cota de 2.300 puntos en un caso de 25 × 23', () => {
    const matrix = new AssignmentMatrix(Array.from({ length: 25 }, (_, row) =>
      Array.from({ length: 23 }, (_, column) => row === column ? 100 : (row + column) % 3 === 0 ? null : (row * 7 + column) % 73),
    ))
    verifyPairs(matrix, 230000)
    expect(algorithm.solve(matrix).pairs).toHaveLength(23)
  })
})

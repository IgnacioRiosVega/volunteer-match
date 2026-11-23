import { AssignmentService, selectionLimit, type AssignmentResult } from '../domain/assignment'
import { SocialProject, Volunteer, type ProjectData } from '../domain/catalog'
import { compatibilityCriteria, type ScoreComponents } from '../domain/compatibility'
import { isCatalog } from './repository'

const format = 'volunteer-match.assignment'
const version = 1
const invalidFile = 'El archivo no contiene una asignación válida de Volunteer Match.'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function serializeAssignment({ input, optimal }: AssignmentResult): string {
  const projects = new Map<string, ProjectData>()
  for (const position of input.positions) {
    const project = projects.get(position.project.id) ?? { ...position.project.data, positions: [] }
    project.positions.push(position.data)
    projects.set(project.id, project)
  }
  return JSON.stringify({
    format, version,
    catalog: { volunteers: input.volunteers.map(volunteer => volunteer.data), projects: [...projects.values()] },
    positionIds: input.positions.map(position => position.id),
    weights: input.weights,
    solution: { pairs: optimal.pairs, totalUnits: optimal.totalUnits },
  }, null, 2)
}

export function restoreAssignment(json: string): AssignmentResult {
  let data: unknown
  try {
    data = JSON.parse(json.replace(/^\uFEFF/, ''))
  } catch {
    throw new Error('El archivo no contiene un JSON válido.')
  }
  if (!record(data) || data.format !== format || data.version !== version) {
    throw new Error('El formato o la versión del archivo de asignación es incompatible.')
  }

  const { catalog, positionIds, weights, solution } = data
  if (!isCatalog(catalog) || !catalog.volunteers.length || catalog.volunteers.length > selectionLimit
    || !Array.isArray(positionIds) || !positionIds.length || positionIds.length > selectionLimit
    || positionIds.some(id => typeof id !== 'string') || new Set(positionIds).size !== positionIds.length
    || !record(weights) || compatibilityCriteria.some(({ key }) => typeof weights[key] !== 'number')
    || !record(solution) || !Array.isArray(solution.pairs)) {
    throw new Error(invalidFile)
  }

  const positions = catalog.projects.flatMap(project => new SocialProject(project).positions)
  const byId = new Map(positions.map(position => [position.id, position]))
  const ordered = positionIds.map(id => byId.get(id))
  if (ordered.length !== positions.length || !ordered.every(position => position !== undefined)) {
    throw new Error(invalidFile)
  }

  const service = new AssignmentService()
  const input = service.prepare(catalog.volunteers.map(profile => new Volunteer(profile)), ordered, weights as ScoreComponents)
  const result = service.solve(input)
  const savedPairs: unknown[] = solution.pairs
  const samePairs = result.optimal.pairs.length === savedPairs.length && result.optimal.pairs.every(({ row, column }, index) => {
    const saved = savedPairs[index]
    return record(saved) && saved.row === row && saved.column === column
  })
  if (!samePairs || result.optimal.totalUnits !== solution.totalUnits) {
    throw new Error('Los datos del archivo no reproducen la asignación guardada.')
  }
  return result
}

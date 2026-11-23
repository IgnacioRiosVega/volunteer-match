import { requiredPositionSkills } from './skills'
import { normalizeSkill, slotLabel, type PositionData, type Volunteer, type VolunteerPosition } from './catalog'

export const compatibilityCriteria = [
  { key: 'skills', label: 'Habilidades', formula: 'Porcentaje de habilidades del puesto que aparecen en el perfil. Si el puesto no indica habilidades, vale 100.' },
  { key: 'experience', label: 'Experiencia', formula: '100 × mín(nivel relevante / nivel deseado, 1). El nivel relevante es 0 fuera de las áreas de experiencia del perfil. Si no se pide experiencia, vale 100.' },
  { key: 'affinity', label: 'Afinidad', formula: '100 si la categoría del proyecto está entre los intereses del perfil. En caso contrario, vale 0.' },
  { key: 'flexibility', label: 'Flexibilidad', formula: 'Porcentaje de bloques de respaldo del puesto que el perfil puede cubrir. Si el puesto no indica bloques de respaldo, vale 100.' },
  { key: 'location', label: 'Ubicación', formula: '100 si la ubicación coincide con una de las zonas preferidas o si el perfil no indica preferencias. En caso contrario, vale 0.' },
] as const

export type ScoreComponents = Record<(typeof compatibilityCriteria)[number]['key'], number>
export type Weights = Pick<ScoreComponents, 'skills' | 'experience' | 'affinity'>
  & Partial<Pick<ScoreComponents, 'flexibility' | 'location'>>

export const defaultWeights: Readonly<ScoreComponents> = {
  skills: 45, experience: 20, affinity: 10, flexibility: 15, location: 10,
}

export function validateWeights(weights: ScoreComponents): void {
  const values = compatibilityCriteria.map(({ key }) => weights[key])
  if (values.some(value => !Number.isInteger(value) || value < 0 || value > 100)
    || values.reduce((sum, value) => sum + value, 0) !== 100) {
    throw new Error('Los pesos deben ser porcentajes enteros entre 0 y 100 y sumar 100 %.')
  }
}

export const blockerLabels = {
  schedule: 'Horario obligatorio',
  skills: 'Habilidades obligatorias',
  experience: 'Experiencia mínima',
  inactive: 'Perfil inactivo',
  closed: 'Puesto cerrado',
} as const
export type BlockerKey = keyof typeof blockerLabels

export type Compatibility =
  | { eligible: false; reasons: string[]; blockers: BlockerKey[] }
  | { eligible: true; score: number; components: ScoreComponents; matchedSkills: string[]; relevantExperience: number }

export function optionalSchedule(position: PositionData): string[] {
  return [...new Set(position.backupSchedule ?? [])].filter(slot => !position.schedule.includes(slot))
}

export class CompatibilityCalculator {
  readonly weights: Readonly<ScoreComponents>

  constructor(weights: Readonly<Weights>) {
    this.weights = { ...weights, flexibility: weights.flexibility ?? 0, location: weights.location ?? 0 }
    validateWeights(this.weights)
  }

  evaluate(volunteer: Volunteer, position: VolunteerPosition): Compatibility {
    const profile = volunteer.data
    const role = position.data
    const category = position.project.data.category
    const skills = new Set(profile.skills.map(normalizeSkill))
    const experience = profile.experienceAreas.includes(category) ? profile.experience : 0
    const required = [...new Map(role.skills.map(skill => [normalizeSkill(skill), skill])).values()]
    const availability = new Set(profile.availability)
    const missingSlots = role.schedule.filter(slot => !availability.has(slot))
    const missingSkills = requiredPositionSkills(role).filter(skill => !skills.has(normalizeSkill(skill)))
    const failures: { key: BlockerKey; reason: string }[] = []

    if (!profile.active) failures.push({ key: 'inactive', reason: 'El perfil está inactivo.' })
    if (!role.active) failures.push({ key: 'closed', reason: 'El puesto está cerrado.' })
    if (missingSlots.length) failures.push({ key: 'schedule', reason: 'Falta disponibilidad en ' + missingSlots.map(slotLabel).join(', ') + '.' })
    if (missingSkills.length) failures.push({ key: 'skills', reason: 'Faltan habilidades obligatorias (' + missingSkills.join(', ') + ').' })
    if (experience < role.minimumExperience) {
      failures.push({ key: 'experience', reason: 'La experiencia relevante es ' + experience + ' de 5 y se exige un mínimo de ' + role.minimumExperience + '.' })
    }
    if (failures.length) return { eligible: false, reasons: failures.map(item => item.reason), blockers: failures.map(item => item.key) }

    const matchedSkills = required.filter(skill => skills.has(normalizeSkill(skill)))
    const backup = optionalSchedule(role)
    const locations = profile.preferredLocations?.map(normalizeSkill) ?? []
    const components: ScoreComponents = {
      skills: required.length ? 100 * matchedSkills.length / required.length : 100,
      experience: role.desiredExperience ? 100 * Math.min(experience / role.desiredExperience, 1) : 100,
      affinity: profile.interests.includes(category) ? 100 : 0,
      flexibility: backup.length ? 100 * backup.filter(slot => availability.has(slot)).length / backup.length : 100,
      location: !locations.length || locations.includes(normalizeSkill(position.project.data.location)) ? 100 : 0,
    }
    const points = compatibilityCriteria.reduce((sum, { key }) => sum + components[key] * this.weights[key], 0)
    // The weighted total is computed in hundredths before rounding.
    return { eligible: true, score: Math.round(points + 1e-9) / 100, components, matchedSkills, relevantExperience: experience }
  }
}

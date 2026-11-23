export const categories = [
  'Educación', 'Salud', 'Medio ambiente', 'Tecnología',
  'Asistencia alimentaria', 'Desarrollo comunitario',
] as const
export type Category = typeof categories[number]

export const weekdays = [
  ['lu', 'Lunes'], ['ma', 'Martes'], ['mi', 'Miércoles'], ['ju', 'Jueves'],
  ['vi', 'Viernes'], ['sa', 'Sábado'], ['do', 'Domingo'],
] as const

export const periods = [
  ['am', 'Mañana', '08:00–12:00'], ['pm', 'Tarde', '14:00–18:00'],
] as const

export const slots = weekdays.flatMap(([day, name]) =>
  periods.map(([period, label, time]) => ({
    id: day + '-' + period, day: name, label, time,
  })),
)

export interface VolunteerData {
  id: string
  name: string
  skills: string[]
  experience: number
  experienceAreas: Category[]
  interests: Category[]
  availability: string[]
  preferredLocations?: string[]
  active: boolean
}

export interface PositionData {
  id: string
  name: string
  skills: string[]
  desiredExperience: number
  schedule: string[]
  backupSchedule?: string[]
  mandatorySkills: string[]
  minimumExperience: number
  active: boolean
}

export interface ProjectData {
  id: string
  name: string
  description: string
  category: Category
  organization: string
  location: string
  positions: PositionData[]
  sdgs?: number[]
}

export interface CatalogSnapshot {
  volunteers: VolunteerData[]
  projects: ProjectData[]
  skillOptions?: string[]
}

export class Volunteer {
  constructor(readonly data: VolunteerData) {}
  get id() { return this.data.id }
  get name() { return this.data.name }
}

export class SocialProject {
  readonly positions: readonly VolunteerPosition[]

  constructor(readonly data: ProjectData) {
    this.positions = data.positions.map(position => new VolunteerPosition(this, position))
  }

  get id() { return this.data.id }
  get name() { return this.data.name }
}

export class VolunteerPosition {
  constructor(readonly project: SocialProject, readonly data: PositionData) {}
  get id() { return this.data.id }
  get name() { return this.data.name }
}

export function normalizeSkill(skill: string): string {
  return skill.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es')
}

export function parseSkills(text: string): string[] {
  const unique = new Map<string, string>()
  for (const item of text.split(',')) {
    const skill = item.trim()
    if (skill && !unique.has(normalizeSkill(skill))) unique.set(normalizeSkill(skill), skill)
  }
  return [...unique.values()]
}

export function slotLabel(id: string): string {
  const slot = slots.find(candidate => candidate.id === id)
  return slot ? [slot.day, slot.time].join(' · ') : id
}

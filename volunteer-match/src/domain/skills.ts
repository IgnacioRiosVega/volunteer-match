import { normalizeSkill, type CatalogSnapshot, type PositionData } from './catalog'

const generalSkills = [
  'Comunicación', 'Enseñanza', 'Lectura', 'Escritura', 'Redacción', 'Diseño',
  'Facilitación', 'Organización', 'Planificación', 'Logística', 'Trabajo en equipo',
  'Liderazgo', 'Escucha activa', 'Oratoria', 'Atención al público', 'Resolución de conflictos',
  'Jardinería', 'Datos', 'Gestión comunitaria',
]

const specificSkills = [
  'Accesibilidad digital', 'Primeros auxilios', 'Soporte técnico', 'Ofimática',
  'Programación', 'Programación Python', 'Análisis de datos', 'Diseño gráfico',
  'Enfermería', 'Medicina', 'Psicología', 'Nutrición', 'Traducción',
  'Interpretación en lengua de señas', 'Braille', 'Cartografía',
  'Conducción de vehículos', 'Electricidad', 'Fotografía',
]

const generalKeys = new Set(generalSkills.map(normalizeSkill))

export function isSpecificSkill(skill: string): boolean {
  return !generalKeys.has(normalizeSkill(skill))
}

export function mergeSkillOptions(...groups: ReadonlyArray<readonly string[]>): string[] {
  const unique = new Map<string, string>()
  for (const group of groups) {
    for (const value of group) {
      const name = value.trim()
      if (name && !unique.has(normalizeSkill(name))) unique.set(normalizeSkill(name), name)
    }
  }
  return [...unique.values()].sort((left, right) => left.localeCompare(right, 'es', { sensitivity: 'base' }))
}

export function catalogSkillOptions(catalog: CatalogSnapshot): string[] {
  return mergeSkillOptions(
    generalSkills, specificSkills, catalog.skillOptions ?? [],
    catalog.volunteers.flatMap(volunteer => volunteer.skills),
    catalog.projects.flatMap(project => project.positions.flatMap(position => [...position.skills, ...position.mandatorySkills])),
  )
}

export function requiredPositionSkills(position: Pick<PositionData, 'skills' | 'mandatorySkills'>): string[] {
  return mergeSkillOptions(position.mandatorySkills, position.skills.filter(isSpecificSkill))
}

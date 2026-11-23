import { categories, slots, type CatalogSnapshot, type PositionData, type ProjectData, type VolunteerData } from '../domain/catalog'
import { isSdgId } from '../domain/sustainable-development'
import { catalogSkillOptions, mergeSkillOptions } from '../domain/skills'
import { demoCatalog } from './demo'

export interface CatalogRepository {
  load(): { catalog: CatalogSnapshot; warning?: string }
  save(catalog: CatalogSnapshot): void
}

type RecordValue = Record<string, unknown>
const isRecord = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const isLevel = (value: unknown): boolean => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5
const isCategory = (value: unknown): boolean => categories.some(category => category === value)
const isSlot = (value: unknown): boolean => slots.some(slot => slot.id === value)
const listOf = (value: unknown, check: (item: unknown) => boolean): boolean => Array.isArray(value) && value.every(check)

function isVolunteer(value: unknown): value is VolunteerData {
  return isRecord(value) && isText(value.id) && isText(value.name) && listOf(value.skills, isText)
    && isLevel(value.experience) && listOf(value.experienceAreas, isCategory) && listOf(value.interests, isCategory)
    && listOf(value.availability, isSlot) && typeof value.active === 'boolean'
    && (value.preferredLocations === undefined || listOf(value.preferredLocations, isText))
}

function isPosition(value: unknown): value is PositionData {
  return isRecord(value) && isText(value.id) && isText(value.name) && listOf(value.skills, isText)
    && isLevel(value.desiredExperience) && isLevel(value.minimumExperience) && listOf(value.schedule, isSlot)
    && listOf(value.mandatorySkills, isText) && typeof value.active === 'boolean'
    && (value.backupSchedule === undefined || listOf(value.backupSchedule, isSlot))
}

function isProject(value: unknown): value is ProjectData {
  return isRecord(value) && isText(value.id) && isText(value.name) && isCategory(value.category)
    && isText(value.description) && isText(value.organization) && isText(value.location)
    && listOf(value.positions, isPosition)
    && (value.sdgs === undefined || listOf(value.sdgs, isSdgId))
    && (value.endorsingOrganization === undefined || typeof value.endorsingOrganization === 'string')
}

const uniqueIds = (items: { id: string }[]) => new Set(items.map(item => item.id)).size === items.length

export function isCatalog(value: unknown): value is CatalogSnapshot {
  if (!isRecord(value) || !Array.isArray(value.volunteers) || !value.volunteers.every(isVolunteer)
    || !Array.isArray(value.projects) || !value.projects.every(isProject)
    || (value.skillOptions !== undefined && !listOf(value.skillOptions, isText))) return false
  return uniqueIds(value.volunteers) && uniqueIds(value.projects) && uniqueIds(value.projects.flatMap(project => project.positions))
}

export class LocalStorageCatalogRepository implements CatalogRepository {
  static readonly key = 'volunteer-match.catalog.v1'

  constructor(private readonly storage: () => Pick<Storage, 'getItem' | 'setItem'> = () => window.localStorage) {}

  load() {
    try {
      const serialized = this.storage().getItem(LocalStorageCatalogRepository.key)
      if (serialized === null) return { catalog: demoCatalog() }
      const data: unknown = JSON.parse(serialized)
      if (!isCatalog(data)) throw new Error('Formato de catálogo incompatible.')
      const projects = data.projects.map(project => {
        const { endorsingOrganization, ...current } = project as ProjectData & { endorsingOrganization?: string }
        return { ...current, organization: endorsingOrganization?.trim() || current.organization }
      })
      const catalog = { ...data, projects }
      return { catalog: { ...catalog, skillOptions: catalogSkillOptions(catalog) } }
    } catch {
      return {
        catalog: demoCatalog(),
        warning: 'No se pudo leer el catálogo guardado en este navegador. Se abrió una copia de los datos de demostración.',
      }
    }
  }

  save(catalog: CatalogSnapshot) {
    try {
      const existing = this.load().catalog.skillOptions ?? []
      const next = { ...catalog, skillOptions: mergeSkillOptions(existing, catalogSkillOptions(catalog)) }
      this.storage().setItem(LocalStorageCatalogRepository.key, JSON.stringify(next))
    } catch {
      throw new Error('El navegador no pudo guardar los cambios. Revisa el espacio y los permisos de almacenamiento.')
    }
  }
}

import { describe, expect, it } from 'vitest'
import { demoCatalog } from '../src/data/demo'
import { LocalStorageCatalogRepository } from '../src/data/repository'
import { AssignmentService } from '../src/domain/assignment'
import { SocialProject, Volunteer, type PositionData, type VolunteerData } from '../src/domain/catalog'
import { CompatibilityCalculator, defaultWeights } from '../src/domain/compatibility'

const baseProfile: VolunteerData = {
  id: 'volunteer', name: 'Ana', skills: ['Enséñanza', 'Lectura'], experience: 2, experienceAreas: ['Educación'],
  interests: ['Educación'], availability: ['lu-am', 'mi-pm'], active: true,
}
const baseRole: PositionData = {
  id: 'position', name: 'Tutoría', skills: ['Enseñanza', 'Lectura', 'Escritura'],
  desiredExperience: 4, schedule: ['lu-am', 'mi-pm'], mandatorySkills: ['Enseñanza'], minimumExperience: 1, active: true,
}
const role = (position: PositionData = baseRole) => new SocialProject({
  id: 'project', name: 'Taller', category: 'Educación', organization: 'Red educativa', location: 'La Paz',
  description: 'Taller ficticio', positions: [position],
}).positions[0]

describe('Compatibilidad', () => {
  const calculator = new CompatibilityCalculator(defaultWeights)

  it('pondera componentes y normaliza habilidades con acentos y mayúsculas', () => {
    const evaluation = calculator.evaluate(new Volunteer(baseProfile), role())
    expect(evaluation).toMatchObject({
      eligible: true, score: 75, matchedSkills: ['Enseñanza', 'Lectura'], relevantExperience: 2,
      components: { experience: 50, affinity: 100, flexibility: 100, location: 100 },
    })
  })

  it('puntúa horarios de respaldo y zonas preferidas sin convertirlos en restricciones', () => {
    const position = role({ ...baseRole, backupSchedule: ['lu-am', 'vi-am', 'vi-am', 'sa-pm'] })
    const profile = { ...baseProfile, availability: [...baseProfile.availability, 'vi-am'] }
    const local = calculator.evaluate(new Volunteer({ ...profile, preferredLocations: ['LA PÁZ'] }), position)
    const remote = calculator.evaluate(new Volunteer({ ...profile, preferredLocations: ['El Alto'] }), position)
    expect(local).toMatchObject({ eligible: true, score: 67.5, components: { flexibility: 50, location: 100 } })
    expect(remote).toMatchObject({ eligible: true, score: 57.5, components: { flexibility: 50, location: 0 } })
  })

  it('exige todos los bloques y habilidades obligatorias, y experiencia en la categoría', () => {
    const person = new Volunteer({ ...baseProfile, availability: ['lu-am'], skills: [], experienceAreas: ['Tecnología'] })
    const evaluation = calculator.evaluate(person, role())
    expect(evaluation.eligible).toBe(false)
    if (!evaluation.eligible) {
      expect(evaluation.reasons).toHaveLength(3)
      expect(evaluation.reasons.join(' ')).toMatch(/Miércoles.*habilidades obligatorias.*experiencia relevante/)
    }
  })

  it('trata los componentes sin exigencia como satisfechos y respeta los pesos configurados', () => {
    const evaluation = new CompatibilityCalculator({ skills: 20, experience: 30, affinity: 50 }).evaluate(
      new Volunteer({ ...baseProfile, interests: [] }), role({ ...baseRole, skills: [], desiredExperience: 0 }),
    )
    expect(evaluation).toMatchObject({ eligible: true, score: 50, components: { skills: 100, experience: 100, affinity: 0 } })
  })

  it('bloquea habilidades específicas aunque el puesto no las marque manualmente y el peso sea cero', () => {
    const specialistRole = role({ ...baseRole, skills: ['Comunicación', 'Programación Python'], mandatorySkills: [], minimumExperience: 0 })
    const profile = new Volunteer({ ...baseProfile, skills: ['Comunicación'], experience: 5 })
    const strict = new CompatibilityCalculator({ skills: 0, experience: 100, affinity: 0 })
    expect(strict.evaluate(profile, specialistRole)).toEqual({
      eligible: false, blockers: ['skills'], reasons: ['Faltan habilidades obligatorias (Programación Python).'],
    })
    const service = new AssignmentService()
    const input = service.prepare([profile], [specialistRole], { skills: 0, experience: 100, affinity: 0 })
    expect(input.matrix.units).toEqual([[null]])
    expect(service.solve(input).optimal.pairs).toEqual([])
    expect(strict.evaluate(new Volunteer({ ...profile.data, skills: ['Comunicación', 'Programación Python'] }), specialistRole).eligible).toBe(true)
  })

  it('aplica la exclusión a habilidades nuevas que se incorporan al catálogo', () => {
    const customRole = role({ ...baseRole, skills: ['Manejo de drones de rescate'], mandatorySkills: [] })
    const evaluation = calculator.evaluate(new Volunteer(baseProfile), customRole)
    expect(evaluation.eligible).toBe(false)
    if (!evaluation.eligible) expect(evaluation.reasons.join(' ')).toContain('Manejo de drones de rescate')
  })

  it('rechaza pesos inválidos y bloquea perfiles inactivos o puestos cerrados', () => {
    expect(() => new CompatibilityCalculator({ ...defaultWeights, affinity: 14 })).toThrow(/sumar 100/)
    expect(() => new CompatibilityCalculator({ skills: 60.5, experience: 24.5, affinity: 15 })).toThrow(/enteros/)
    expect(calculator.evaluate(new Volunteer({ ...baseProfile, active: false }), role({ ...baseRole, active: false })))
      .toEqual({ eligible: false, blockers: ['inactive', 'closed'], reasons: ['El perfil está inactivo.', 'El puesto está cerrado.'] })
  })
})

describe('Servicio de asignación', () => {
  const service = new AssignmentService()
  const demo = demoCatalog()

  it('contrasta la demostración, identifica vacantes y conserva los puntajes exactos', () => {
    const prepared = service.prepare(
      demo.volunteers.map(volunteer => new Volunteer(volunteer)),
      demo.projects.flatMap(project => new SocialProject(project).positions), defaultWeights,
    )
    const result = service.solve(prepared)
    expect(result.optimal.totalUnits).toBe(108083)
    expect(result.alternative.totalUnits).toBe(99333)
    expect(result.optimal.pairs).toHaveLength(11)
    expect(result.vacantPositions.map(position => position.name)).toEqual(['Mentoría en accesibilidad'])
    expect(result.unassignedVolunteers).toHaveLength(5)
    expect(result.maximumEligiblePairs).toBe(11)
    expect(result.allPositionsFeasible).toBe(false)
    expect(result.smallerSideFeasible).toBe(false)
    expect(result.improvementPercent).toBeCloseTo(8.809, 3)
    for (const solution of [result.optimal, result.alternative]) {
      expect(solution.pairs.every(pair => prepared.evaluations[pair.row][pair.column].eligible)).toBe(true)
      expect(new Set(solution.pairs.map(pair => pair.row)).size).toBe(solution.pairs.length)
      expect(new Set(solution.pairs.map(pair => pair.column)).size).toBe(solution.pairs.length)
    }
  })

  it('maneja el empate con base cero y limita selecciones duplicadas o demasiado grandes', () => {
    const person = new Volunteer({ ...baseProfile, availability: [] })
    const result = service.solve(service.prepare([person], [role()], defaultWeights))
    expect(result.improvementUnits).toBe(0)
    expect(result.improvementPercent).toBeNull()
    expect(result.maximumEligiblePairs).toBe(0)
    expect(() => service.prepare([person, person], [role()], defaultWeights)).toThrow(/una sola vez/)
    const people = Array.from({ length: 26 }, (_, index) => new Volunteer({ ...baseProfile, id: String(index) }))
    expect(() => service.prepare(people, [role()], defaultWeights)).toThrow(/25/)
  })

  it('diferencia cobertura del lado menor y posibilidad de cubrir todos los puestos', () => {
    const person = new Volunteer(baseProfile)
    const result = service.solve(service.prepare([person], [role(), role({ ...baseRole, id: 'second' })], defaultWeights))
    expect(result.maximumEligiblePairs).toBe(1)
    expect(result.smallerSideFeasible).toBe(true)
    expect(result.allPositionsFeasible).toBe(false)
  })
})

describe('Persistencia del catálogo', () => {
  it('guarda cambios, distingue un catálogo vacío y conserva la demostración como copia nueva', () => {
    const memory = new Map<string, string>()
    const repository = new LocalStorageCatalogRepository(() => ({
      getItem: key => memory.get(key) ?? null,
      setItem: (key, value) => { memory.set(key, value) },
    }))
    expect(repository.load().catalog.volunteers).toHaveLength(16)
    repository.save({ volunteers: [], projects: [] })
    expect(repository.load()).toMatchObject({ catalog: { volunteers: [], projects: [] } })
    repository.save(demoCatalog())
    expect(repository.load().catalog.projects).toHaveLength(5)
  })

  it('carga proyectos anteriores y valida los nuevos campos de ODS y respaldo', () => {
    const legacy = demoCatalog()
    delete legacy.projects[0].sdgs
    let serialized = JSON.stringify(legacy)
    const repository = new LocalStorageCatalogRepository(() => ({
      getItem: () => serialized,
      setItem: (_key, value) => { serialized = value },
    }))
    expect(repository.load().warning).toBeUndefined()
    expect(repository.load().catalog.projects[0].name).toBe('Aulas Abiertas')
    const updated = repository.load().catalog
    updated.projects[0].sdgs = [4, 10]
    updated.projects[0].organization = 'Entidad de prueba'
    repository.save(updated)
    expect(repository.load().catalog.projects[0]).toMatchObject({ sdgs: [4, 10], organization: 'Entidad de prueba' })
    updated.projects[0].sdgs = [18]
    repository.save(updated)
    expect(repository.load().warning).toMatch(/no se pudo leer/i)
  })

  it('unifica la organización antigua y conserva habilidades después de borrar el perfil', () => {
    const original = demoCatalog()
    const legacy = {
      ...original,
      volunteers: [{ ...original.volunteers[0], skills: ['Manejo de drones de rescate'] }],
      projects: [{ ...original.projects[0], endorsingOrganization: 'PNUD' }],
    }
    let serialized = JSON.stringify(legacy)
    const repository = new LocalStorageCatalogRepository(() => ({
      getItem: () => serialized,
      setItem: (_key, value) => { serialized = value },
    }))
    const loaded = repository.load().catalog
    expect(loaded.projects[0].organization).toBe('PNUD')
    expect(loaded.projects[0]).not.toHaveProperty('endorsingOrganization')
    expect(loaded.skillOptions).toContain('Manejo de drones de rescate')
    repository.save({ volunteers: [], projects: [], skillOptions: loaded.skillOptions })
    expect(repository.load().catalog.skillOptions).toContain('Manejo de drones de rescate')
  })

  it('presenta la demostración y un aviso si los datos son ilegibles', () => {
    const repository = new LocalStorageCatalogRepository(() => ({
      getItem: () => '{"volunteers":[null],"projects":[]}', setItem: () => { throw new Error('Quota') },
    }))
    expect(repository.load().catalog.volunteers).toHaveLength(16)
    expect(repository.load().warning).toMatch(/no se pudo leer/i)
    expect(() => repository.save(demoCatalog())).toThrow(/no pudo guardar/)
  })
})

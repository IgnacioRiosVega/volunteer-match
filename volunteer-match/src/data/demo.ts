import type { CatalogSnapshot, Category, PositionData, VolunteerData } from '../domain/catalog'

function volunteer(
  id: string, name: string, skills: string[], experience: number,
  experienceAreas: Category[], interests: Category[], availability: string[], preferredLocations?: string[],
): VolunteerData {
  return { id, name, skills, experience, experienceAreas, interests, availability, preferredLocations, active: true }
}

function position(
  id: string, name: string, skills: string[], desiredExperience: number,
  schedule: string[], mandatorySkills: string[] = [], minimumExperience = 0,
): PositionData {
  return { id, name, skills, desiredExperience, schedule, mandatorySkills, minimumExperience, active: true }
}

export function demoCatalog(): CatalogSnapshot {
  return {
    volunteers: [
      volunteer('v-01', 'Amalia Ferral', ['Lectura', 'Enseñanza', 'Ofimática'], 4, ['Educación', 'Tecnología'], ['Educación', 'Tecnología'], ['lu-am', 'lu-pm', 'mi-am'], ['La Paz']),
      volunteer('v-02', 'Mateo Orihuela', ['Lectura', 'Enseñanza'], 3, ['Educación'], ['Educación'], ['lu-am', 'mi-am'], ['La Paz', 'El Alto']),
      volunteer('v-03', 'Inés Valmora', ['Diseño', 'Redacción'], 3, ['Educación'], ['Educación'], ['mi-pm']),
      volunteer('v-04', 'Damián Arroyo', ['Comunicación', 'Facilitación', 'Enseñanza'], 3, ['Educación', 'Medio ambiente'], ['Educación', 'Medio ambiente'], ['sa-am', 'do-am'], ['Cochabamba']),
      volunteer('v-05', 'Elena Miraflores', ['Comunicación', 'Facilitación'], 2, ['Educación'], ['Educación'], ['sa-am'], ['La Paz']),
      volunteer('v-06', 'Leo Cárdena', ['Primeros auxilios', 'Comunicación'], 4, ['Salud'], ['Salud'], ['ma-am']),
      volunteer('v-07', 'Nora Ayala', ['Datos', 'Organización'], 3, ['Salud', 'Tecnología'], ['Salud'], ['ju-pm', 'ma-am']),
      volunteer('v-08', 'Bruno Quisbert', ['Jardinería', 'Trabajo en equipo'], 3, ['Medio ambiente'], ['Medio ambiente'], ['sa-am']),
      volunteer('v-09', 'Sara Monteciel', ['Enseñanza', 'Comunicación'], 1, ['Educación'], ['Medio ambiente'], ['sa-am']),
      volunteer('v-10', 'Iván Costera', ['Soporte técnico', 'Ofimática'], 4, ['Tecnología'], ['Tecnología'], ['vi-pm']),
      volunteer('v-11', 'Alba Galindo', ['Logística', 'Organización'], 4, ['Asistencia alimentaria'], ['Asistencia alimentaria'], ['sa-am']),
      volunteer('v-12', 'Tomás Velazco', ['Logística', 'Trabajo en equipo'], 3, ['Asistencia alimentaria'], ['Asistencia alimentaria'], ['sa-am']),
      volunteer('v-13', 'Julia Belver', ['Enseñanza', 'Comunicación'], 2, ['Educación'], ['Tecnología'], ['do-pm']),
      volunteer('v-14', 'Emilio Solana', ['Organización', 'Redacción'], 2, ['Salud'], ['Educación'], ['mi-pm', 'ju-pm']),
      volunteer('v-15', 'Vera Nival', ['Jardinería', 'Comunicación'], 2, ['Medio ambiente'], ['Medio ambiente'], ['sa-pm']),
      volunteer('v-16', 'Gael Rueda', ['Soporte técnico', 'Datos'], 2, ['Tecnología'], ['Tecnología'], ['vi-pm', 'ju-pm']),
    ],
    projects: [
      {
        sdgs: [4, 10],
        id: 'p-01', name: 'Aulas Abiertas', category: 'Educación', organization: 'Comunidad Horizonte', location: 'La Paz',
        description: 'Círculos de lectura y acompañamiento escolar con materiales preparados junto a las familias del barrio.',
        positions: [
          { ...position('s-01', 'Tutoría lectora', ['Lectura', 'Enseñanza'], 4, ['lu-am']), backupSchedule: ['mi-am', 'lu-pm'] },
          position('s-02', 'Material didáctico', ['Diseño', 'Redacción'], 3, ['mi-pm']),
          position('s-03', 'Facilitación comunitaria', ['Comunicación', 'Facilitación'], 3, ['sa-am']),
        ],
      },
      {
        sdgs: [3, 10],
        id: 'p-02', name: 'Salud Cerca', category: 'Salud', organization: 'Red Barrio Vivo', location: 'El Alto',
        description: 'Jornadas vecinales de prevención y orientación, con registro de participación y apoyo a los equipos locales.',
        positions: [
          position('s-04', 'Orientación preventiva', ['Comunicación', 'Primeros auxilios'], 3, ['ma-am'], ['Primeros auxilios']),
          position('s-05', 'Registro de jornadas', ['Datos', 'Organización'], 3, ['ju-pm']),
        ],
      },
      {
        sdgs: [13, 15],
        id: 'p-03', name: 'Raíces Urbanas', category: 'Medio ambiente', organization: 'Colectivo Tierra Común', location: 'Cochabamba',
        description: 'Recuperación de espacios verdes a través de plantaciones participativas y talleres de educación ambiental.',
        positions: [
          position('s-06', 'Plantación urbana', ['Jardinería', 'Trabajo en equipo'], 3, ['sa-am']),
          { ...position('s-07', 'Educación ambiental', ['Enseñanza', 'Comunicación'], 3, ['sa-am']), backupSchedule: ['do-am'] },
        ],
      },
      {
        sdgs: [4, 9, 10],
        id: 'p-04', name: 'Puentes Digitales', category: 'Tecnología', organization: 'Taller Abierto', location: 'La Paz',
        description: 'Talleres de alfabetización digital y apoyo técnico para ampliar el acceso a herramientas informáticas.',
        positions: [
          { ...position('s-08', 'Alfabetización digital', ['Ofimática', 'Enseñanza'], 4, ['lu-am']), backupSchedule: ['lu-pm'] },
          position('s-09', 'Soporte de equipos', ['Soporte técnico', 'Ofimática'], 4, ['vi-pm']),
          position('s-10', 'Mentoría en accesibilidad', ['Accesibilidad digital', 'Enseñanza'], 4, ['do-pm'], ['Accesibilidad digital'], 4),
        ],
      },
      {
        sdgs: [2, 12],
        id: 'p-05', name: 'Mesa Compartida', category: 'Asistencia alimentaria', organization: 'Red Alimento Común', location: 'El Alto',
        description: 'Clasificación y distribución de donaciones alimentarias en coordinación con redes comunitarias.',
        positions: [
          position('s-11', 'Clasificación de donaciones', ['Logística', 'Organización'], 4, ['sa-am']),
          position('s-12', 'Ruta de distribución', ['Logística', 'Trabajo en equipo'], 3, ['sa-am']),
        ],
      },
    ],
  }
}

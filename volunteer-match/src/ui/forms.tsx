import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Save, X } from 'lucide-react'
import { categories, parseSkills, periods, weekdays, type Category, type PositionData, type ProjectData, type VolunteerData } from '../domain/catalog'
import { optionalSchedule } from '../domain/compatibility'
import { isSdgId, sdgLabel, sustainableDevelopmentGoals } from '../domain/sustainable-development'
import { mergeSkillOptions } from '../domain/skills'
import { organizationOptions } from '../data/organizations'
import { SkillPicker } from './skill-picker'
import { Alert } from './shared'

type EditorProps<T> = { initial?: T; onSave: (record: T) => void; onCancel: () => void }
const text = (data: FormData, field: string) => String(data.get(field) ?? '').trim()
const selected = (data: FormData, field: string) => data.getAll(field).map(String)
const selectedSkills = (data: FormData, field: string) =>
  mergeSkillOptions(selected(data, field), parseSkills(text(data, field + 'Draft')))

function newId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), part => part.toString(16).padStart(8, '0')).join('')
}

function Editor({ title, description, onCancel, onSubmit, error, children }: {
  title: string; description: string; onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; error: string; children: ReactNode
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])

  return <section className="surface editor" aria-labelledby="editor-title">
    <header className="editor-header"><div><h2 ref={heading} id="editor-title" tabIndex={-1}>{title}</h2><p>{description}</p></div>
      <button className="icon-button" type="button" aria-label="Cerrar formulario" onClick={onCancel}><X size={20} aria-hidden /></button>
    </header>
    <form onSubmit={onSubmit} className="editor-form">
      {error && <Alert kind="error">{error}</Alert>}
      {children}
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="button button-primary"><Save size={16} aria-hidden /> Guardar cambios</button>
      </div>
    </form>
  </section>
}

function SlotFields({ legend, initial, name = 'slots', hint }: { legend: string; initial?: readonly string[]; name?: string; hint?: string }) {
  return <fieldset className="slot-fields">
    <legend>{legend}</legend>
    <p className="field-hint">Mañana 08:00–12:00 · Tarde 14:00–18:00</p>
    {hint && <p className="field-hint">{hint}</p>}
    <div className="slot-grid">{weekdays.map(([day, label]) => <div key={day} className="slot-day">
      <span>{label}</span>
      {periods.map(([period, periodName, time]) => {
        const id = day + '-' + period
        return <label className="slot-option" key={id}>
          <input type="checkbox" name={name} value={id} defaultChecked={initial?.includes(id)} aria-label={label + ' ' + periodName + ' ' + time + (name === 'slots' ? '' : ' (respaldo)')} />
          {periodName}
        </label>
      })}
    </div>)}</div>
  </fieldset>
}

function CategoryFields({ legend, name, initial }: { legend: string; name: string; initial?: readonly Category[] }) {
  return <fieldset className="category-fields"><legend>{legend}</legend><div className="check-grid">
    {categories.map(category => <label key={category} className="check-option">
      <input type="checkbox" name={name} value={category} defaultChecked={initial?.includes(category)} />{category}
    </label>)}
  </div></fieldset>
}

export function VolunteerEditor({ initial, onCancel, onSave, skillOptions }: EditorProps<VolunteerData> & { skillOptions: readonly string[] }) {
  const [skills, setSkills] = useState(initial?.skills ?? [])
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = text(data, 'name')
    if (!name) { setError('Escribe el nombre del voluntario.'); return }
    onSave({
      id: initial?.id ?? newId(), name, skills: selectedSkills(data, 'skills'),
      experience: Number(text(data, 'experience')), experienceAreas: selected(data, 'experienceAreas') as Category[],
      interests: selected(data, 'interests') as Category[], availability: selected(data, 'slots'),
      preferredLocations: parseSkills(text(data, 'preferredLocations')),
      active: data.has('active'),
    })
  }

  return <Editor title={initial ? 'Editar voluntario' : 'Registrar voluntario'} description="El perfil se usará para calcular la compatibilidad con los puestos." onCancel={onCancel} onSubmit={submit} error={error}>
    <div className="form-grid">
      <label className="field"><span>Nombre completo</span><input name="name" required maxLength={80} defaultValue={initial?.name} placeholder="Ej. Ana Rivera" /></label>
      <label className="field"><span>Nivel de experiencia (0–5)</span><input name="experience" type="number" min={0} max={5} step={1} required defaultValue={initial?.experience ?? 0} /><small>0 equivale a sin experiencia y 5 a experiencia avanzada.</small></label>
      <div className="span-2"><SkillPicker label="Habilidades" name="skills" options={skillOptions} value={skills} onChange={setSkills} /></div>
    </div>
    <CategoryFields legend="Áreas de experiencia" name="experienceAreas" initial={initial?.experienceAreas} />
    <CategoryFields legend="Áreas de interés" name="interests" initial={initial?.interests} />
    <label className="field"><span>Zonas preferidas (opcional)</span>
      <input name="preferredLocations" maxLength={300} defaultValue={initial?.preferredLocations?.join(', ')} placeholder="Ej. La Paz, El Alto" />
      <small>Usa los mismos nombres que en la ubicación de los proyectos. Separa las zonas con comas. En blanco, cualquier zona recibe el máximo puntaje.</small>
    </label>
    <SlotFields legend="Disponibilidad semanal" initial={initial?.availability} />
    <label className="check-option active-check"><input type="checkbox" name="active" defaultChecked={initial?.active ?? true} />Perfil activo y disponible para asignaciones</label>
  </Editor>
}

export function ProjectEditor({ initial, onCancel, onSave }: EditorProps<ProjectData>) {
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = text(data, 'name')
    const description = text(data, 'description')
    const organization = text(data, 'organization')
    const location = text(data, 'location')
    if (![name, description, organization, location].every(Boolean)) {
      setError('Completa el nombre, la descripción, la organización y la ubicación.')
      return
    }
    onSave({
      id: initial?.id ?? newId(), name, description, organization, location,
      category: text(data, 'category') as Category, positions: initial?.positions ?? [],
      sdgs: selected(data, 'sdgs').map(Number).filter(isSdgId),
    })
  }

  return <Editor title={initial ? 'Editar proyecto' : 'Crear proyecto social'} description="Define la iniciativa y registra sus puestos por separado." onCancel={onCancel} onSubmit={submit} error={error}>
    <div className="form-grid">
      <label className="field"><span>Nombre del proyecto</span><input name="name" required maxLength={100} defaultValue={initial?.name} /></label>
      <label className="field"><span>Categoría</span><select name="category" defaultValue={initial?.category}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
      <label className="field"><span>Organización del proyecto</span><input name="organization" list="project-organizations" required maxLength={100} defaultValue={initial?.organization} placeholder="Selecciona o escribe una organización" /></label>
      <label className="field"><span>Ubicación referencial</span><input name="location" required maxLength={100} defaultValue={initial?.location} /></label>
      <datalist id="project-organizations">{organizationOptions.map(organization => <option value={organization} key={organization} />)}</datalist>
      <label className="field span-2"><span>Descripción</span><textarea name="description" rows={3} maxLength={500} required defaultValue={initial?.description} /></label>
    </div>
    <fieldset className="sdg-fields"><legend>Objetivos de Desarrollo Sostenible (ODS)</legend>
      <p className="field-hint">Selecciona los objetivos a los que contribuyen las actividades del proyecto.</p>
      <div className="sdg-options">{sustainableDevelopmentGoals.map(goal => <label className="check-option" key={goal.id}>
        <input type="checkbox" name="sdgs" value={goal.id} defaultChecked={initial?.sdgs?.includes(goal.id)} />{sdgLabel(goal.id)}
      </label>)}</div>
    </fieldset>
  </Editor>
}

export function PositionEditor({ initial, onCancel, onSave, project, skillOptions }: EditorProps<PositionData> & { project: ProjectData; skillOptions: readonly string[] }) {
  const [skills, setSkills] = useState(initial?.skills ?? [])
  const [mandatorySkills, setMandatorySkills] = useState(initial?.mandatorySkills ?? [])
  const options = mergeSkillOptions(skillOptions, skills, mandatorySkills)
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = text(data, 'name')
    const schedule = selected(data, 'slots')
    if (!name || !schedule.length) {
      setError('Escribe el nombre del puesto y elige al menos un bloque de horario.')
      return
    }
    onSave({
      id: initial?.id ?? newId(), name, skills: selectedSkills(data, 'skills'),
      desiredExperience: Number(text(data, 'experience')), schedule,
      backupSchedule: selected(data, 'backupSlots').filter(slot => !schedule.includes(slot)),
      mandatorySkills: selectedSkills(data, 'mandatory'),
      minimumExperience: Number(text(data, 'minimum')), active: data.has('active'),
    })
  }

  return <Editor title={initial ? 'Editar puesto' : 'Crear puesto'} description={project.name + ' · ' + project.category} onCancel={onCancel} onSubmit={submit} error={error}>
    <div className="form-grid">
      <label className="field span-2"><span>Nombre del puesto</span><input name="name" required maxLength={100} defaultValue={initial?.name} placeholder="Ej. Facilitación comunitaria" /></label>
      <SkillPicker label="Habilidades del puesto" name="skills" options={options} value={skills} onChange={setSkills} hint="Las habilidades específicas son indispensables. Las generales aportan a la compatibilidad." />
      <label className="field"><span>Experiencia deseada (0–5)</span><input name="experience" type="number" min={0} max={5} step={1} required defaultValue={initial?.desiredExperience ?? 0} /></label>
      <SkillPicker label="Otras habilidades obligatorias" name="mandatory" options={options} value={mandatorySkills} onChange={setMandatorySkills} hint="Añade aquí cualquier habilidad general que también sea un requisito indispensable." />
      <label className="field"><span>Experiencia mínima obligatoria (0–5)</span><input name="minimum" type="number" min={0} max={5} step={1} required defaultValue={initial?.minimumExperience ?? 0} /><small>Se evalúa en la categoría del proyecto.</small></label>
    </div>
    <SlotFields legend="Horario requerido" initial={initial?.schedule} />
    <SlotFields legend="Horarios de respaldo (opcional)" name="backupSlots" initial={initial && optionalSchedule(initial)}
      hint="Indica bloques adicionales por si cambia el horario. Solo influyen en el puntaje de flexibilidad. Los bloques marcados como obligatorios se cuentan una sola vez." />
    <label className="check-option active-check"><input type="checkbox" name="active" defaultChecked={initial?.active ?? true} />Puesto abierto a asignación</label>
  </Editor>
}

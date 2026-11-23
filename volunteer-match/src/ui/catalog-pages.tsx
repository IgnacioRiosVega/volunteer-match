import { useEffect, useRef, useState } from 'react'
import { Building2, CalendarDays, Eye, FolderOpen, GraduationCap, HandHeart, HeartPulse, Laptop, MapPin, Pencil, Plus, Search, Sprout, Trash2, UsersRound, X } from 'lucide-react'
import { normalizeSkill, slotLabel, type Category, type PositionData, type ProjectData, type VolunteerData } from '../domain/catalog'
import { requiredPositionSkills } from '../domain/skills'
import { optionalSchedule } from '../domain/compatibility'
import { sdgLabel } from '../domain/sustainable-development'
import { PositionEditor, ProjectEditor, VolunteerEditor } from './forms'
import { EmptyState, initials, PageHeading, StatusPill, TagList } from './shared'

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some(value => value.id === item.id)
    ? items.map(value => value.id === item.id ? item : value)
    : [...items, item]
}

export function ConfirmBox({ title, children, onConfirm, onCancel, label = 'Confirmar eliminación' }: {
  title: string; children: string; onConfirm: () => void; onCancel: () => void; label?: string
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [title])
  return <section className="confirm-box" aria-label={title} role="alert">
    <div><h2 ref={heading} tabIndex={-1}>{title}</h2><p>{children}</p></div><div className="confirm-actions">
      <button type="button" className="button button-secondary" onClick={onCancel}>Cancelar</button>
      <button type="button" className="button button-danger" onClick={onConfirm}>{label}</button>
    </div>
  </section>
}

export function Volunteers({ volunteers, save, skillOptions }: { volunteers: VolunteerData[]; skillOptions: readonly string[]; save: (items: VolunteerData[], message: string) => boolean }) {
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<{ profile?: VolunteerData } | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<VolunteerData | null>(null)
  const profile = volunteers.find(volunteer => volunteer.id === profileId)
  const profileHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { profileHeading.current?.focus() }, [profileId])
  const normalized = normalizeSkill(query)
  const filtered = volunteers.filter(volunteer => normalizeSkill([volunteer.name, ...volunteer.skills].join(' ')).includes(normalized))
  const openEditor = (selected?: VolunteerData) => { setPendingDelete(null); setEditor({ profile: selected }) }

  return <>
    <PageHeading tag="CATÁLOGO / PERSONAS" title="Voluntarios" description="Registra habilidades, experiencia y disponibilidad para construir perfiles de compatibilidad." action={
      <button type="button" className="button button-primary" onClick={() => openEditor()}><Plus size={19} aria-hidden /> Nuevo voluntario</button>
    } />
    <div className="container section-layout">
      {editor && <VolunteerEditor skillOptions={skillOptions} key={editor.profile?.id ?? 'new'} initial={editor.profile} onCancel={() => setEditor(null)} onSave={record => {
        if (save(upsert(volunteers, record), editor.profile ? 'Perfil actualizado.' : 'Voluntario registrado.')) setEditor(null)
      }} />}
      {pendingDelete && <ConfirmBox title={'¿Eliminar a ' + pendingDelete.name + '?'} onCancel={() => setPendingDelete(null)} onConfirm={() => {
        if (save(volunteers.filter(item => item.id !== pendingDelete.id), 'Voluntario eliminado.')) setPendingDelete(null)
      }}>El perfil se quitará del catálogo y de las futuras asignaciones.</ConfirmBox>}
      {profile && <section className="surface profile-detail" aria-label={'Perfil de ' + profile.name}>
        <div className="profile-title"><span className="avatar">{initials(profile.name)}</span><div><h2 ref={profileHeading} tabIndex={-1}>{profile.name}</h2><StatusPill active={profile.active} /></div>
          <button type="button" className="icon-button" aria-label="Cerrar perfil" onClick={() => setProfileId(null)}><X size={20} aria-hidden /></button>
        </div>
        <dl className="details-grid">
          <div><dt>Habilidades</dt><dd><TagList items={profile.skills} /></dd></div>
          <div><dt>Experiencia</dt><dd>{profile.experience} de 5 · {profile.experienceAreas.join(', ') || 'Sin área registrada'}</dd></div>
          <div><dt>Zonas preferidas</dt><dd>{profile.preferredLocations?.join(', ') || 'Cualquier zona'}</dd></div>
          <div><dt>Intereses</dt><dd>{profile.interests.join(', ') || 'Sin intereses registrados'}</dd></div>
          <div><dt>Disponibilidad</dt><dd>{profile.availability.map(slotLabel).join(', ') || 'Sin bloques registrados'}</dd></div>
        </dl>
      </section>}
      <div className="catalog-toolbar">
        <div><h2>Directorio</h2><p>{volunteers.length} perfiles · {volunteers.filter(volunteer => volunteer.active).length} activos</p></div>
        <label className="search-field"><Search size={17} aria-hidden /><span className="sr-only">Buscar voluntarios</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nombre o habilidad" /></label>
      </div>
      {filtered.length ? <div className="surface table-scroll" role="region" aria-label="Directorio de voluntarios" tabIndex={0}>
        <table className="data-table catalog-table">
          <caption className="sr-only">Directorio de voluntarios</caption>
          <thead><tr><th scope="col">Voluntario</th><th scope="col">Habilidades</th><th scope="col">Experiencia</th><th scope="col">Disponibilidad</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
          <tbody>{filtered.map(volunteer => <tr key={volunteer.id}>
            <th scope="row"><span className="person-cell"><span className="avatar">{initials(volunteer.name)}</span>{volunteer.name}</span></th>
            <td><TagList items={volunteer.skills} /></td><td>{volunteer.experience} / 5</td>
            <td><span className="inline-icon"><CalendarDays size={15} aria-hidden />{volunteer.availability.length} {volunteer.availability.length === 1 ? 'bloque' : 'bloques'}</span></td>
            <td><StatusPill active={volunteer.active} /></td>
            <td><div className="row-actions">
              <button type="button" className="icon-button" aria-label={'Ver perfil de ' + volunteer.name} title="Ver perfil" onClick={() => setProfileId(volunteer.id)}><Eye size={17} aria-hidden /></button>
              <button type="button" className="icon-button" aria-label={'Editar a ' + volunteer.name} title="Editar" onClick={() => openEditor(volunteer)}><Pencil size={16} aria-hidden /></button>
              <button type="button" className="icon-button delete-button" aria-label={'Eliminar a ' + volunteer.name} title="Eliminar" onClick={() => {
                setEditor(null)
                setPendingDelete(volunteer)
              }}><Trash2 size={16} aria-hidden /></button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div> : <EmptyState icon={UsersRound} title={query ? 'No hay perfiles que coincidan' : 'El directorio está vacío'}>
        {query ? 'Prueba con otro nombre o habilidad.' : 'Registra un voluntario para empezar a construir un escenario.'}
      </EmptyState>}
    </div>
  </>
}

const categoryIcon = {
  Educación: GraduationCap, Salud: HeartPulse, 'Medio ambiente': Sprout,
  Tecnología: Laptop, 'Asistencia alimentaria': HandHeart, 'Desarrollo comunitario': UsersRound,
} satisfies Record<Category, typeof FolderOpen>

type ProjectEditorState = { type: 'project'; item?: ProjectData } | { type: 'position'; project: ProjectData; item?: PositionData }
type ProjectDelete = { project: ProjectData; position?: PositionData }

export function Projects({ projects, save, skillOptions }: { projects: ProjectData[]; skillOptions: readonly string[]; save: (items: ProjectData[], message: string) => boolean }) {
  const [editor, setEditor] = useState<ProjectEditorState | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ProjectDelete | null>(null)
  const openEditor = (state: ProjectEditorState) => { setPendingDelete(null); setEditor(state) }
  const openDelete = (state: ProjectDelete) => {
    setEditor(null)
    setPendingDelete(state)
  }
  const updatePositions = (projectId: string, change: (positions: PositionData[]) => PositionData[]) =>
    projects.map(project => project.id === projectId ? { ...project, positions: change(project.positions) } : project)
  const remove = () => {
    if (!pendingDelete) return
    const { project, position } = pendingDelete
    const items = position
      ? updatePositions(project.id, positions => positions.filter(item => item.id !== position.id))
      : projects.filter(item => item.id !== project.id)
    if (save(items, position ? 'Puesto eliminado.' : 'Proyecto eliminado.')) setPendingDelete(null)
  }

  return <>
    <PageHeading tag="CATÁLOGO / INICIATIVAS" title="Proyectos sociales" description="Crea iniciativas, registra sus ODS y la organización del proyecto, y define los puestos que necesitan voluntariado." action={
      <button type="button" className="button button-primary" onClick={() => openEditor({ type: 'project' })}><Plus size={19} aria-hidden /> Nuevo proyecto</button>
    } />
    <div className="container section-layout">
      {editor?.type === 'project' && <ProjectEditor key={editor.item?.id ?? 'new-project'} initial={editor.item} onCancel={() => setEditor(null)} onSave={record => {
        if (save(upsert(projects, record), editor.item ? 'Proyecto actualizado.' : 'Proyecto creado.')) setEditor(null)
      }} />}
      {editor?.type === 'position' && <PositionEditor skillOptions={skillOptions} key={editor.item?.id ?? editor.project.id} project={editor.project} initial={editor.item} onCancel={() => setEditor(null)} onSave={record => {
        if (save(updatePositions(editor.project.id, positions => upsert(positions, record)), editor.item ? 'Puesto actualizado.' : 'Puesto creado.')) setEditor(null)
      }} />}
      {pendingDelete && <ConfirmBox title={'¿Eliminar ' + (pendingDelete.position?.name ?? pendingDelete.project.name) + '?'} onCancel={() => setPendingDelete(null)} onConfirm={remove}>
        {pendingDelete.position ? 'El puesto se quitará del catálogo.' : 'También se eliminarán los puestos asociados a este proyecto.'}
      </ConfirmBox>}

      <div className="catalog-toolbar"><div><h2>Iniciativas registradas</h2><p>{projects.length} proyectos · {projects.reduce((total, project) => total + project.positions.filter(position => position.active).length, 0)} puestos abiertos</p></div></div>
      {projects.length ? <div className="project-grid">{projects.map(project => {
        const Icon = categoryIcon[project.category]
        return <article className="surface project-card" key={project.id}>
          <header className="project-header"><span className="icon-tile"><Icon size={24} aria-hidden /></span>
            <div className="project-title"><span className="micro-label">{project.category}</span><h3>{project.name}</h3></div>
            <div className="row-actions">
              <button type="button" className="icon-button" aria-label={'Editar proyecto ' + project.name} title="Editar" onClick={() => openEditor({ type: 'project', item: project })}><Pencil size={16} aria-hidden /></button>
              <button type="button" className="icon-button delete-button" aria-label={'Eliminar proyecto ' + project.name} title="Eliminar" onClick={() => openDelete({ project })}><Trash2 size={16} aria-hidden /></button>
            </div>
          </header>
          <p className="project-description">{project.description}</p>
          <div className="project-meta"><span><Building2 size={15} aria-hidden />{project.organization}</span><span><MapPin size={15} aria-hidden />{project.location}</span></div>
          <div className="project-alignment">
            <p className="sdg-heading">Objetivos de Desarrollo Sostenible</p>
            {project.sdgs?.length ? <ul className="sdg-tags" aria-label="ODS del proyecto">{project.sdgs.map(id => <li key={id}>{sdgLabel(id)}</li>)}</ul> : <p className="muted">ODS por registrar</p>}
          </div>
          <div className="position-heading"><h4>Puestos ({project.positions.length})</h4><button type="button" className="button button-quiet" onClick={() => openEditor({ type: 'position', project })}><Plus size={16} aria-hidden /> Añadir puesto<span className="sr-only"> a {project.name}</span></button></div>
          {project.positions.length ? <div className="position-list">{project.positions.map(position => <details className="position-item" key={position.id}>
            <summary><span>{position.name}</span><StatusPill active={position.active} yes="Abierto" no="Cerrado" /></summary>
            <div className="position-content">
              <dl>
                <div><dt>Habilidades del puesto</dt><dd><TagList items={position.skills} /></dd></div>
                <div><dt>Horario</dt><dd>{position.schedule.map(slotLabel).join(', ') || 'Sin horario'}</dd></div>
                <div><dt>Horarios de respaldo</dt><dd>{optionalSchedule(position).map(slotLabel).join(', ') || 'Sin bloques de respaldo'}</dd></div>
                <div><dt>Experiencia deseada</dt><dd>{position.desiredExperience} de 5</dd></div>
                <div><dt>Restricciones obligatorias</dt><dd>{requiredPositionSkills(position).join(', ') || 'Sin habilidades obligatorias'} · Experiencia mínima {position.minimumExperience} de 5</dd></div>
              </dl>
              <div className="row-actions">
                <button type="button" className="button button-quiet" aria-label={'Editar puesto ' + position.name} onClick={() => openEditor({ type: 'position', project, item: position })}><Pencil size={15} aria-hidden /> Editar puesto</button>
                <button type="button" className="button button-quiet delete-button" aria-label={'Eliminar puesto ' + position.name} onClick={() => openDelete({ project, position })}><Trash2 size={15} aria-hidden /> Eliminar puesto</button>
              </div>
            </div>
          </details>)}</div> : <p className="muted">Agrega un puesto para incluir este proyecto en una asignación.</p>}
        </article>
      })}</div> : <EmptyState icon={FolderOpen} title="Todavía no hay proyectos">Crea una iniciativa y añade los puestos que quieres cubrir.</EmptyState>}
    </div>
  </>
}

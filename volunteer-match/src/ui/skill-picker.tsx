import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { normalizeSkill, parseSkills } from '../domain/catalog'
import { isSpecificSkill, mergeSkillOptions } from '../domain/skills'

interface SkillPickerProps {
  label: string
  name: string
  options: readonly string[]
  value: readonly string[]
  onChange: (skills: string[]) => void
  hint?: string
}

export function SkillPicker({ label, name, options, value, onChange, hint }: SkillPickerProps) {
  const id = useId()
  const listId = id + '-options'
  const hintId = id + '-hint'
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])
  const input = useRef<HTMLInputElement>(null)
  const selectedKeys = new Set(value.map(normalizeSkill))
  const allOptions = mergeSkillOptions(options, value)
  const term = normalizeSkill(query)
  const suggestions = allOptions.filter(option =>
    !selectedKeys.has(normalizeSkill(option)) && normalizeSkill(option).includes(term),
  )
  const canCreate = Boolean(term) && !allOptions.some(option => normalizeSkill(option) === term)
  const choices = suggestions.map(skill => ({ skill, create: false }))
  if (canCreate) choices.push({ skill: query.trim(), create: true })
  const activeChoice = choices[active]

  useEffect(() => {
    if (open) optionRefs.current[active]?.scrollIntoView?.({ block: 'nearest' })
  }, [active, open])

  const select = (skill: string) => {
    onChange(mergeSkillOptions(value, [skill]))
    setQuery('')
    setActive(0)
    setOpen(true)
    input.current?.focus()
  }

  const changeQuery = (text: string) => {
    const parts = text.split(',')
    if (parts.length > 1) onChange(mergeSkillOptions(value, parseSkills(parts.slice(0, -1).join(','))))
    setQuery(parts.at(-1) ?? '')
    setActive(0)
    setOpen(true)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActive(current => open ? Math.max(0, Math.min(current + direction, choices.length - 1)) : 0)
    }
    if (event.key === 'Enter' && open && activeChoice) {
      event.preventDefault()
      select(activeChoice.skill)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    }
  }

  return <div className="skill-field" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <label htmlFor={id}>{label}</label>
    <div className="skill-control">
      {value.length > 0 && <ul className="selected-skills" aria-label={label + ' seleccionadas'}>
        {value.map(skill => <li key={normalizeSkill(skill)}>
          <span>{skill}</span>
          {isSpecificSkill(skill) && <small title="Es obligatoria cuando un puesto la solicita">Específica</small>}
          <input type="hidden" name={name} value={skill} />
          <button type="button" aria-label={'Quitar habilidad ' + skill} onClick={() => onChange(value.filter(item => normalizeSkill(item) !== normalizeSkill(skill)))}><X size={14} aria-hidden /></button>
        </li>)}
      </ul>}
      <div className="skill-input-row">
        <input id={id} ref={input} type="text" name={name + 'Draft'} role="combobox"
          aria-autocomplete="list" aria-expanded={open} aria-controls={listId}
          aria-activedescendant={open && activeChoice ? listId + '-' + active : undefined}
          aria-describedby={hintId} autoComplete="off" maxLength={80} value={query}
          onFocus={() => setOpen(true)} onChange={event => changeQuery(event.target.value)}
          onKeyDown={onKeyDown} placeholder="Buscar o añadir una habilidad" />
        <button type="button" className="skill-toggle" aria-label={'Mostrar opciones de ' + label.toLocaleLowerCase('es')} aria-expanded={open}
          onClick={() => { input.current?.focus(); setOpen(!open) }}><ChevronDown size={18} aria-hidden /></button>
      </div>
      {open && <ul role="listbox" id={listId} aria-label={'Opciones de ' + label.toLocaleLowerCase('es')} className="skill-options">
        {choices.map(({ skill, create }, index) => <li key={normalizeSkill(skill)} id={listId + '-' + index}
          role="option" aria-selected={index === active} ref={element => { optionRefs.current[index] = element }}
          onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => select(skill)}>
          <span>{create && <Plus size={15} aria-hidden />}{create ? 'Crear y añadir «' + skill + '»' : skill}</span>
          <small>{isSpecificSkill(skill) ? 'Específica' : 'General'}</small>
        </li>)}
        {choices.length === 0 && <li className="skill-options-empty" role="presentation">La habilidad ya está seleccionada.</li>}
      </ul>}
    </div>
    <p id={hintId} className="field-hint">{hint ?? 'Escribe para buscar, elige una opción o añade una habilidad nueva. Se guardará al guardar el registro.'}</p>
  </div>
}

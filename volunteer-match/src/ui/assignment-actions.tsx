import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { CircleHelp, FolderOpen, Save } from 'lucide-react'
import { restoreAssignment, serializeAssignment } from '../data/assignment-file'
import type { AssignmentResult } from '../domain/assignment'
import { pageLink } from './shared'

function ActionDialog({ id, title, trigger, footer, children }: {
  id: string
  title: string
  trigger: ReactNode
  footer?: boolean
  children: (close: () => void) => ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  return <>
    <button type="button" className={'button ' + (footer ? 'footer-help' : 'button-primary')}
      aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>{trigger}</button>
    <dialog ref={dialog} className="assignment-dialog" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children(() => dialog.current?.close())}
    </dialog>
  </>
}

export function AssignmentHelp() {
  return <ActionDialog id="assignment-help" footer title="Guía del sistema de asignación" trigger={<><CircleHelp size={17} aria-hidden />Help</>}>
    {close => <>
      <ol className="assignment-help-steps">
        <li><strong>Prepara el catálogo.</strong> Registra voluntarios con sus habilidades y disponibilidad. En Proyectos, crea los puestos y define el horario, las habilidades y la experiencia que exigen.</li>
        <li><strong>Selecciona personas y puestos.</strong> En Asignación de voluntariado, marca quiénes y qué puestos participarán. Puedes ajustar habilidades, experiencia, afinidad, flexibilidad y ubicación. Los cinco pesos deben sumar 100 %.</li>
        <li><strong>Genera la matriz.</strong> Selecciona una celda para ver el desglose del puntaje. Si aparece ×, consulta qué requisito impide ese cruce.</li>
        <li><strong>Ejecuta el algoritmo y consulta el tablero.</strong> En Resultados puedes ver quién quedó asignado y revisar la cobertura, la compatibilidad media y las vacantes. Filtra por proyecto u objetivo de desarrollo sostenible.</li>
        <li><strong>Guarda o retoma el trabajo.</strong> En Resultados, usa Guardar para nombrar y descargar el JSON. Usa Abrir para volver a consultar un archivo guardado. En Asignación, pulsa Limpiar para empezar de nuevo con el mismo catálogo.</li>
      </ol>
      <div className="assignment-actions dialog-actions">
        <button type="button" className="button button-secondary" onClick={close}>Cerrar</button>
        <a className="button button-primary" href={pageLink('asignacion')} onClick={close}>Ir a Asignación</a>
      </div>
    </>}
  </ActionDialog>
}

function downloadAssignment(event: FormEvent<HTMLFormElement>, result: AssignmentResult, close: () => void) {
  event.preventDefault()
  const raw = String(new FormData(event.currentTarget).get('fileName') ?? '')
  const name = raw.trim().replace(/\.json$/i, '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').replace(/[. ]+$/, '') || 'asignacion-voluntariado'
  const url = URL.createObjectURL(new Blob([serializeAssignment(result)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name + '.json'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  close()
}

export function AssignmentFileActions({ result, onOpen }: { result: AssignmentResult | null; onOpen: (result: AssignmentResult) => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [opening, setOpening] = useState(false)

  const readFile = async (file: File) => {
    setMessage(null)
    setOpening(true)
    try {
      const contents = await file.text()
      if (!fileInput.current) return
      onOpen(restoreAssignment(contents))
      setMessage({ text: 'Asignación abierta.', error: false })
    } catch (reason) {
      setMessage({ text: reason instanceof Error ? reason.message : 'No se pudo abrir la asignación.', error: true })
    } finally {
      setOpening(false)
    }
  }

  return <div className="assignment-file-actions">
    <div className="assignment-actions">
      {result && <ActionDialog id="assignment-save" title="Guardar asignación" trigger={<><Save size={17} aria-hidden />Guardar</>}>
        {close => <form className="assignment-dialog-form" onSubmit={event => downloadAssignment(event, result, close)}>
          <label className="field"><span>Nombre del archivo</span>
            <input name="fileName" required maxLength={90} defaultValue="asignacion-voluntariado" autoFocus />
            <small>Se descargará en formato JSON.</small>
          </label>
          <div className="assignment-actions dialog-actions">
            <button type="button" className="button button-secondary" onClick={close}>Cancelar</button>
            <button type="submit" className="button button-primary">Guardar JSON</button>
          </div>
        </form>}
      </ActionDialog>}
      <input type="file" ref={fileInput} accept=".json,application/json" aria-label="Archivo de asignación" hidden onChange={event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) void readFile(file)
      }} />
      <button type="button" className="button button-secondary" disabled={opening} onClick={() => fileInput.current?.click()}>
        <FolderOpen size={17} aria-hidden />{opening ? 'Abriendo…' : 'Abrir'}
      </button>
    </div>
    {message && <p className={message.error ? 'assignment-file-error' : ''} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
  </div>
}

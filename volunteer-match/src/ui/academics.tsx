import { BookOpen, CheckCircle2, ExternalLink, FileText, Target } from 'lucide-react'
import { AssignmentMatrix } from '../domain/matrix'
import { HungarianAlgorithm } from '../domain/hungarian'
import { compatibilityCriteria, defaultWeights } from '../domain/compatibility'
import { AlgorithmStepper } from './stepper'
import { formatUnits, NextLink, PageHeading } from './shared'

const objectives = [
  'Modelar la relación entre voluntarios y puestos mediante una matriz de compatibilidad.',
  'Aplicar el algoritmo húngaro para obtener una distribución de máxima compatibilidad.',
  'Gestionar voluntarios, proyectos, ODS y puestos desde una misma plataforma.',
  'Explicar cómo se obtiene cada puntaje y por qué se bloquea un cruce.',
  'Visualizar las transformaciones de la matriz durante la resolución.',
  'Identificar puestos vacantes y necesidades de nuevas convocatorias.',
  'Evaluar las asignaciones con indicadores de compatibilidad y cobertura.',
]

export function About() {
  return <>
    <PageHeading tag="CONOCE VOLUNTEER MATCH" title="Voluntariado con propósito" description="Una plataforma para conectar las capacidades de las personas con las necesidades de los proyectos sociales." />
    <div className="container section-layout reading-layout">
      <aside className="reading-aside"><span className="icon-tile"><FileText size={23} aria-hidden /></span><h2>En esta sección</h2>
        <ol><li>Introducción</li><li>Definición del problema</li><li>Objetivos</li><li>Justificación</li></ol>
        <NextLink to="teoria">Conocer el método de asignación</NextLink>
      </aside>
      <div className="reading-content">
        <article><span className="section-index">01</span><h2>Introducción</h2><p>Volunteer Match conecta las capacidades de las personas voluntarias con las necesidades de los proyectos sociales. La plataforma reúne información sobre habilidades, experiencia, intereses y disponibilidad para identificar asignaciones que aprovechen mejor los recursos humanos. Cada proyecto registra sus puestos, requisitos y objetivos de desarrollo sostenible, junto con la organización del proyecto. A partir de estos datos, el algoritmo húngaro determina una distribución que maximiza la compatibilidad total. El procedimiento se presenta paso a paso para que cada decisión pueda comprenderse y revisarse.</p></article>
        <article><span className="section-index">02</span><h2>Definición del problema</h2><p>Elegir candidatos por orden de llegada, por disponibilidad o a partir de evaluaciones aisladas puede producir una distribución subóptima. Si una persona es adecuada para dos puestos y otra solo encaja en uno, la primera elección puede reducir la compatibilidad total o dejar una vacante.</p><p>El problema central es cómo distribuir las competencias disponibles entre los puestos para maximizar la compatibilidad del conjunto, respetando los horarios y los requisitos obligatorios.</p></article>
        <article><span className="section-index">03</span><h2>Objetivos</h2><div className="objective"><Target size={24} aria-hidden /><div><h3>Objetivo general</h3><p>Desarrollar una aplicación web que implemente el algoritmo húngaro para optimizar la distribución de voluntarios entre puestos de proyectos sociales, mediante criterios cuantificables de compatibilidad y una visualización del procedimiento y sus resultados.</p></div></div>
          <h3>Objetivos específicos</h3><ul className="check-list">{objectives.map(objective => <li key={objective}><CheckCircle2 size={18} aria-hidden />{objective}</li>)}</ul>
        </article>
        <article><span className="section-index">04</span><h2>Justificación</h2><p>La plataforma facilita la coordinación del voluntariado con criterios explícitos y revisables. Permite reconocer dónde puede aportar mejor cada persona, documentar las necesidades de los proyectos y detectar puestos que requieren una convocatoria adicional. La visualización del método ayuda a comprender cómo se construye la decisión.</p></article>
      </div>
    </div>
  </>
}

const benefits = [[60, 90, 70], [80, 100, 50], [70, 80, 80]]
const exercise = new HungarianAlgorithm().solve(new AssignmentMatrix(benefits), { complete: true, trace: true })
const exampleVolunteers = ['Ana', 'Bruno', 'Carla']
const examplePositions = ['Tutoría', 'Logística', 'Comunicación']

const lesson = [
  ['Convertir beneficios en costos', 'La matriz de beneficios mide cuánto aporta cada combinación y se desea maximizar su suma. Se resta cada beneficio del mayor valor de la matriz para obtener costos que se puedan minimizar.'],
  ['Reducir filas y columnas', 'Se resta el menor costo de cada fila y, sobre la matriz obtenida, el menor costo de cada columna. Estas operaciones crean ceros y conservan la diferencia de costo entre asignaciones completas.'],
  ['Cubrir ceros y ajustar', 'Se busca el mayor conjunto de ceros independientes y se cubren todos los ceros con el menor número de líneas. Si faltan pares, se resta el menor valor descubierto de las celdas descubiertas y se suma en las intersecciones de dos líneas.'],
  ['Seleccionar e interpretar', 'Cuando hay un cero independiente por fila y por columna, se recuperan sus beneficios originales y se suman. En una asignación con vacantes, los pares que contienen elementos ficticios se retiran del resultado real.'],
]

export function Theory() {
  return <>
    <PageHeading tag="MARCO TEÓRICO" title="Algoritmo de asignación" description="Comprende el método húngaro y recorre un ejemplo resuelto con los mismos cálculos que usa la plataforma." action={<NextLink to="asignacion">Asignar voluntariado</NextLink>} />
    <div className="container section-layout theory-page">
      <section className="theory-intro" aria-labelledby="theory-heading"><h2 id="theory-heading">¿Cómo funciona el algoritmo de asignación?</h2>
        <p>Un problema de asignación busca relacionar dos grupos de elementos, como voluntarios y puestos. Cada fila de la matriz representa una persona y cada columna, un puesto. La decisión se toma considerando el conjunto de combinaciones, con un máximo de un puesto por persona y una persona por puesto.</p>
        <p>El método húngaro resuelve este problema mediante transformaciones de la matriz. En una matriz de beneficios se busca el total más alto. En una matriz de costos se busca el más bajo. La conversión entre ambas permite aplicar el mismo procedimiento.</p>
      </section>
      <section className="lesson-notes" aria-labelledby="procedure-heading"><h2 id="procedure-heading">Procedimiento del método húngaro</h2><div className="lesson-grid">
        {lesson.map(([title, description], index) => <article key={title}><span className="section-index">{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{description}</p></article>)}
      </div></section>
      <section className="worked-example" aria-labelledby="example-heading">
        <div className="lesson-callout"><span className="icon-tile"><BookOpen size={23} aria-hidden /></span><div><h2 id="example-heading">Ejemplo resuelto paso a paso</h2><p>Asigna a Ana, Bruno y Carla a Tutoría, Logística y Comunicación. Todos los cruces del ejemplo son elegibles y se exige cubrir los tres puestos. Antes de avanzar, intenta encontrar los mínimos de cada fila y columna.</p></div></div>
        <AlgorithmStepper steps={exercise.steps} rowLabels={exampleVolunteers} columnLabels={examplePositions} />
        <details className="lesson-solution surface"><summary>Consultar la interpretación de la solución</summary>
          <ul>{exercise.pairs.map(({ row, column }) => <li key={row}>{exampleVolunteers[row]} → {examplePositions[column]} · {benefits[row][column]} puntos</li>)}</ul>
          <p>Compatibilidad total de la asignación óptima <strong>{formatUnits(exercise.totalUnits)} puntos</strong>.</p>
        </details>
      </section>
      <details className="theory-model surface"><summary>Modelo aplicado al voluntariado</summary>
        <div className="reading-content">
          <article><span className="section-index">01</span><h2>Investigación operativa</h2><p>La investigación operativa formula problemas de decisión con objetivos, datos y restricciones. La asignación es un caso de optimización combinatoria en el que se elige un conjunto de pares entre alternativas discretas.</p></article>
          <article><span className="section-index">02</span><h2>Compatibilidad y elegibilidad</h2>
            <p>Antes de puntuar un cruce se comprueba que el perfil esté activo, el puesto esté abierto y el voluntario pueda asistir a todos los bloques requeridos. Las habilidades específicas solicitadas por el puesto se exigen antes de puntuar, junto con cualquier otra habilidad marcada como obligatoria y el nivel mínimo de experiencia. Las habilidades nuevas se consideran específicas por defecto.</p>
            <div className="math-line" aria-label="Beneficio igual a la suma de los componentes ponderados dividida entre cien">bᵢⱼ = ∑ₖ (wₖ × sᵢⱼₖ) / 100</div>
            <div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Componente</th><th scope="col">Cálculo en escala de 0 a 100</th><th scope="col">Peso inicial</th></tr></thead><tbody>
              {compatibilityCriteria.map(({ key, label, formula }) => <tr key={key}><th scope="row">{label}</th><td>{formula}</td><td>{defaultWeights[key]} %</td></tr>)}
            </tbody></table></div>
            <p>Por ejemplo, con 100 en habilidades, 75 en experiencia, 100 en afinidad, 50 en flexibilidad y 100 en ubicación, los pesos iniciales dan 45 + 15 + 10 + 7,50 + 10 = <strong>87,50 puntos</strong>.</p>
            <p>Los pesos son configurables y deben sumar 100 %. El beneficio final se redondea a dos decimales. La resolución usa centésimas enteras para comparar los ceros y sumar los puntajes con exactitud.</p>
          </article>
          <article><span className="section-index">03</span><h2>Función objetivo y restricciones</h2>
            <p>La variable binaria xᵢⱼ vale 1 cuando el voluntario i ocupa el puesto j. Se maximiza la suma de los beneficios de los pares elegidos.</p>
            <div className="math-line">max Z = ∑ᵢ ∑ⱼ bᵢⱼ xᵢⱼ</div>
            <ul><li>Para cada voluntario i, ∑ⱼ xᵢⱼ ≤ 1.</li><li>Para cada puesto j, ∑ᵢ xᵢⱼ ≤ 1.</li><li>xᵢⱼ ∈ {'{0, 1}'}, con xᵢⱼ = 0 en los cruces prohibidos.</li></ul>
            <p>La cobertura posible se calcula como el máximo número de pares elegibles. La función de compatibilidad puede preferir menos pares cuando su beneficio total es mayor.</p>
          </article>
          <article><span className="section-index">04</span><h2>Matrices rectangulares y vacantes</h2>
            <p>Con v voluntarios y p puestos, la plataforma añade p filas y v columnas ficticias para obtener una matriz de tamaño (v + p) × (v + p). Cada cruce que involucra un elemento ficticio aporta cero puntos y representa una persona sin asignación o un puesto vacante.</p>
            <p>Cualquier asignación parcial real puede completarse con estos elementos ficticios. Al retirarlos de la solución, se recuperan los pares reales con el mismo beneficio. Las celdas prohibidas permanecen bloqueadas durante toda la resolución.</p>
            <p>La transformación cᵢⱼ = B − bᵢⱼ, con B igual al mayor beneficio permitido, da a cada solución completa de n pares un costo nB − Z. Como nB es constante, minimizar ese costo equivale a maximizar Z.</p>
          </article>
          <article><span className="section-index">05</span><h2>Optimalidad y complejidad</h2>
            <p>El método húngaro fue publicado por Kuhn en 1955. Las reducciones y los ajustes conservan la diferencia de costo entre soluciones completas. Cuando se obtienen n ceros independientes y todos los costos reducidos permitidos son no negativos, la selección de costo reducido cero es óptima.</p>
            <p>La variante implementada conserva el emparejamiento durante los ajustes y vuelve a recorrer la matriz al buscar caminos aumentantes. Su cota temporal es O(n⁴), con n = v + p, y la matriz de trabajo ocupa O(n²). Cada ejecución admite hasta 25 perfiles y 25 puestos.</p>
            <a className="text-link" href="https://doi.org/10.1002/nav.3800020109" target="_blank" rel="noreferrer">Kuhn, H. W. (1955). The Hungarian method for the assignment problem. <ExternalLink size={15} aria-hidden /></a>
          </article>
        </div>
      </details>
    </div>
  </>
}

export function Conclusions() {
  return <>
    <PageHeading tag="CONCLUSIONES" title="El valor de una asignación coordinada" description="Alcance, límites y aplicaciones del modelo en la gestión del voluntariado." />
    <div className="container section-layout reading-layout">
      <aside className="reading-aside"><span className="icon-tile"><Target size={24} aria-hidden /></span><h2>De los datos a la decisión</h2><p>Estas conclusiones describen el alcance del modelo. Cada asignación tiene sus propios datos, restricciones y resultados.</p><NextLink to="resultados">Consultar resultados</NextLink></aside>
      <div className="reading-content">
        <article><span className="section-index">01</span><h2>Utilidad y eficiencia</h2><p>El algoritmo húngaro maximiza la suma de compatibilidades dentro de las restricciones registradas. La asignación global considera cómo cada elección afecta a los demás puestos y permite coordinar las competencias disponibles en el conjunto de proyectos.</p></article>
        <article><span className="section-index">02</span><h2>Información y seguimiento</h2><p>La calidad de la solución depende de los perfiles, los pesos y el detalle con que se registran horarios y habilidades. Los resultados apoyan la coordinación y requieren revisar la disponibilidad real junto con las personas involucradas.</p><p>Los ODS permiten describir la orientación de cada proyecto y la organización registrada aporta contexto sobre su coordinación. Las vacantes identificadas ayudan a preparar nuevas convocatorias o revisar los requisitos de los puestos.</p></article>
        <article><span className="section-index">03</span><h2>Alcance y aplicaciones</h2><p>El modelo puede aplicarse a tutorías, jornadas de salud, iniciativas ambientales, apoyo tecnológico y asistencia alimentaria. La versión actual asigna un puesto por persona y utiliza bloques semanales. Las operaciones con varios turnos por persona pueden ampliarse mediante capacidades y prioridades de cobertura.</p></article>
      </div>
    </div>
  </>
}

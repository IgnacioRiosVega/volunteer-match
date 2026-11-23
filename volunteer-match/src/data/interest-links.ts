import unvLogo from '../assets/organizations/unv.svg'
import unicefLogo from '../assets/organizations/unicef.webp'
import pnudLogo from '../assets/organizations/pnud.svg'
import acnurLogo from '../assets/organizations/acnur.svg'
import ifrcLogo from '../assets/organizations/ifrc.svg'
import unitarLogo from '../assets/organizations/unitar.png'
import unLogo from '../assets/mark.svg'

export const interestLinks = [
  {
    name: 'UNV · Voluntarios de las Naciones Unidas',
    logo: unvLogo,
    description: 'Conoce las modalidades de voluntariado en tu país, en el extranjero y en línea, y cómo presentar tu candidatura en la plataforma de UNV.',
    url: 'https://www.unv.org/es/become-volunteer',
  },
  {
    name: 'Voluntariado en UNICEF',
    logo: unicefLogo,
    logoOnBlue: true,
    description: 'Descubre cómo colaborar en favor de la infancia. UNICEF trabaja con voluntarios principalmente a través de UNV y también remite a sus comités nacionales.',
    url: 'https://www.unicef.org/careers/es/voluntariado-en-unicef',
  },
  {
    name: 'PNUD · Desarrollo sostenible',
    logo: pnudLogo,
    description: 'Explora las áreas de trabajo del Programa de las Naciones Unidas para el Desarrollo, sus oportunidades profesionales y la orientación para postularte.',
    url: 'https://www.undp.org/es/careers',
  },
  {
    name: 'ACNUR · Apoyo a personas refugiadas',
    logo: acnurLogo,
    description: 'Encuentra formas de participar en la protección de personas refugiadas, junto con información sobre voluntariado, pasantías y recursos de sensibilización.',
    url: 'https://www.unhcr.org/get-involved',
  },
  {
    name: 'Cruz Roja y Media Luna Roja · IFRC',
    logo: ifrcLogo,
    description: 'Busca tu Sociedad Nacional de la Cruz Roja o de la Media Luna Roja para conocer cómo incorporarte al voluntariado y apoyar a tu comunidad.',
    url: 'https://www.ifrc.org/get-involved/volunteer-us',
  },
  {
    name: 'Naciones Unidas en Bolivia',
    logo: unLogo,
    description: 'Consulta el portal de oportunidades del sistema de las Naciones Unidas en Bolivia y sus accesos a convocatorias y voluntariado.',
    url: 'https://bolivia.un.org/es/jobs',
  },
  {
    name: 'UNITAR · Formación para la acción',
    logo: unitarLogo,
    description: 'Explora cursos de autoaprendizaje e inscripción abierta para ampliar tus conocimientos en desarrollo sostenible, paz y cooperación internacional.',
    url: 'https://event.unitar.org/by-date/self-paced-open-enrolment-events',
  },
] as const

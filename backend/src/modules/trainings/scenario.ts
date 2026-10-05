/**
 * Catálogo del escenario de formación en prevención de riesgos laborales.
 * El backend es la fuente de verdad de qué riesgos existen, de su contenido didáctico y de la
 * medida correcta de cada uno; el frontal solo decide dónde colocarlos en la escena 3D a partir de
 * su `id` y nunca recibe la respuesta correcta (ver `publicScenario`).
 *
 * Las citas normativas reproducen el texto consolidado de boe.es, que el propio BOE publica
 * como informativo y sin valor jurídico.
 */

/** Referencia normativa con cita literal. */
export interface Regulation {
  /** Norma y precepto, p. ej. «RD 614/2001, art. 3.3». */
  reference: string;
  quote: string;
  url: string;
}

/** Riesgo que el alumno debe identificar, con su ficha didáctica y la decisión que se le pide. */
export interface Hazard {
  id: string;
  label: string;
  severity: "alta" | "media";
  /** Qué ve el alumno y por qué es un riesgo. */
  description: string;
  /** Qué puede pasar si no se corrige. */
  consequence: string;
  /** Qué hay que hacer; se muestra en el informe final, no durante la prueba. */
  measure: string;
  /** Tres actuaciones posibles entre las que el alumno elige al identificar el riesgo. */
  options: [string, string, string];
  /** Índice de la actuación correcta en `options`. Nunca sale del backend durante la prueba. */
  correctOption: 0 | 1 | 2;
  regulation: Regulation;
}

/** Criterio de superación de la prueba. */
export interface PassCriteria {
  /** Puntuación mínima, en porcentaje de los puntos posibles. */
  minScorePercent: number;
  /** Si los riesgos de severidad alta deben quedar identificados y bien resueltos. */
  requireHighSeverity: boolean;
}

/** Escenario de formación con su situación de partida, límites, criterio y riesgos. */
export interface Scenario {
  id: string;
  title: string;
  /** Situación de partida que se cuenta en el briefing. */
  situation: string;
  objective: string;
  timeLimitSeconds: number;
  passCriteria: PassCriteria;
  framework: Regulation;
  hazards: Hazard[];
}

/** Riesgo tal como lo ve el frontal durante la prueba: sin la respuesta correcta. */
export type PublicHazard = Omit<Hazard, "correctOption">;

/** Escenario tal como lo ve el frontal durante la prueba. */
export type PublicScenario = Omit<Scenario, "hazards"> & { hazards: PublicHazard[] };

/** Escenario único del ejemplo: un taller industrial al empezar el turno. */
export const WORKSHOP_SCENARIO: Scenario = {
  id: "taller",
  title: "Taller de mantenimiento",
  situation:
    "Son las 7:45. Eres el primero del turno de mañana y el encargado te ha pedido revisar el taller antes de que entre la cuadrilla a las 8:00.",
  objective:
    "Recorre el taller con la mirada, identifica los riesgos y decide qué haces con cada uno. Tienes tres minutos.",
  timeLimitSeconds: 180,
  passCriteria: { minScorePercent: 75, requireHighSeverity: true },
  framework: {
    reference: "Ley 31/1995 de Prevención de Riesgos Laborales, art. 15.1",
    quote: "a) Evitar los riesgos. b) Evaluar los riesgos que no se puedan evitar. c) Combatir los riesgos en su origen.",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-1995-24292",
  },
  hazards: [
    {
      id: "carga-suspendida",
      label: "Carga suspendida sobre zona de paso",
      severity: "alta",
      description: "El puente grúa mantiene un palé con bidones colgado justo encima de la vía de paso pintada en el suelo.",
      consequence: "Si cede la eslinga o el gancho, la carga cae sobre quien pase por debajo: aplastamiento.",
      measure: "No pasar ni detenerse bajo la carga. Balizar la zona y desviar el paso mientras dure la maniobra.",
      options: [
        "Pasar rápido por debajo mientras la carga esté quieta.",
        "No pasar bajo la carga: balizar la zona y desviar el paso mientras dure la maniobra.",
        "Avisar al gruista cuando acabe el turno.",
      ],
      correctOption: 1,
      regulation: {
        reference: "RD 1215/1997, anexo II, apdo. 3.1.c",
        quote: "Deberán tomarse medidas para evitar la presencia de trabajadores bajo las cargas suspendidas.",
        url: "https://www.boe.es/buscar/act.php?id=BOE-A-1997-17824",
      },
    },
    {
      id: "cable-pelado",
      label: "Cable eléctrico pelado junto al cuadro",
      severity: "alta",
      description: "Un cable con el aislamiento dañado sale del cuadro eléctrico y cruza el suelo echando chispas.",
      consequence: "Contacto eléctrico directo: electrocución o quemaduras. Las chispas pueden iniciar un incendio.",
      measure: "No tocarlo. Cortar la alimentación desde el cuadro, señalizar y avisar a personal electricista cualificado.",
      options: [
        "Cubrir el corte con cinta aislante y seguir trabajando.",
        "Apartarlo con el pie para que nadie tropiece.",
        "No tocarlo: cortar la alimentación desde el cuadro, señalizar y avisar a un electricista cualificado.",
      ],
      correctOption: 2,
      regulation: {
        reference: "RD 614/2001, art. 3.3",
        quote: "Las instalaciones eléctricas de los lugares de trabajo se utilizarán y mantendrán en la forma adecuada.",
        url: "https://www.boe.es/buscar/act.php?id=BOE-A-2001-11881",
      },
    },
    {
      id: "derrame-aceite",
      label: "Derrame de aceite sin señalizar",
      severity: "media",
      description: "Una mancha de aceite junto al bidón, sin absorbente ni señal de suelo resbaladizo.",
      consequence: "Resbalón y caída al mismo nivel, con golpes contra la maquinaria cercana.",
      measure: "Contener y limpiar con absorbente de inmediato. Mientras tanto, señalizar: la señal no sustituye a la limpieza.",
      options: [
        "Poner una señal de suelo resbaladizo y dejarlo para el turno de limpieza.",
        "Contener y limpiar con absorbente de inmediato, señalizando mientras tanto.",
        "Echar agua para diluirlo.",
      ],
      correctOption: 1,
      regulation: {
        reference: "RD 486/1997, anexo II, apdo. 2",
        quote:
          "Se eliminarán con rapidez los desperdicios, las manchas de grasa, los residuos de sustancias peligrosas y demás productos residuales que puedan originar accidentes.",
        url: "https://www.boe.es/buscar/act.php?id=BOE-A-1997-8669",
      },
    },
    {
      id: "extintor-bloqueado",
      label: "Extintor bloqueado por cajas",
      severity: "media",
      description: "El extintor junto al muro queda tapado por cajas de cartón apiladas delante.",
      consequence: "En un conato de incendio se pierden segundos decisivos para alcanzarlo.",
      measure: "Retirar las cajas, dejar libre el acceso y comprobar que la señal del extintor se ve.",
      options: [
        "Retirar las cajas y dejar libre y visible el acceso al extintor.",
        "Anotarlo para la próxima revisión del extintor.",
        "Llevar el extintor a otro sitio donde no estorbe.",
      ],
      correctOption: 0,
      regulation: {
        reference: "RD 513/2017 (RIPCI), anexo I, sección 1.ª, apdo. 4",
        quote: "El emplazamiento de los extintores permitirá que sean fácilmente visibles y accesibles.",
        url: "https://www.boe.es/buscar/act.php?id=BOE-A-2017-6606",
      },
    },
  ],
};

/** Indica si `hazardId` pertenece al escenario. */
export const hasHazard = (scenario: Scenario, hazardId: string): boolean =>
  scenario.hazards.some(({ id }) => id === hazardId);

/** Escenario sin las respuestas correctas, que es lo único que se sirve durante la prueba. */
export const publicScenario = (scenario: Scenario): PublicScenario => ({
  ...scenario,
  hazards: scenario.hazards.map(({ correctOption: _correct, ...hazard }) => hazard),
});

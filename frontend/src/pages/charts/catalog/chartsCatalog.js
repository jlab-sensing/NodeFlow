/** @typedef {'builtin' | 'unified'} PanelKind */

/**
 * @typedef {object} CatalogEntry
 * @property {string} panelId
 * @property {string} label
 * @property {string} description
 * @property {string} category
 * @property {PanelKind} kind
 * @property {string} [unifiedType] - UnifiedChart `type` when kind === 'unified'
 */

export const LAYOUT_VERSION = 'v1'

/** Built-in top-grid panels (PowerCharts / TerosCharts). */
export const BUILTIN_CATALOG = [
  {
    panelId: 'power-vi',
    label: 'Voltage & Current',
    description: 'power · voltage & current',
    category: 'power',
    kind: 'builtin',
  },
  {
    panelId: 'power-p',
    label: 'Power',
    description: 'power · µW',
    category: 'power',
    kind: 'builtin',
  },
  {
    panelId: 'teros',
    label: 'VWC & EC',
    description: 'teros · volumetric water & conductivity',
    category: 'teros',
    kind: 'builtin',
  },
  {
    panelId: 'temp',
    label: 'Temperature',
    description: 'teros · °C',
    category: 'teros',
    kind: 'builtin',
  },
]

/** Catalog entries backed by UnifiedChart types. */
export const UNIFIED_CATALOG = [
  {
    panelId: 'u:co2',
    unifiedType: 'co2',
    label: 'CO₂',
    description: 'sensor · co2 · ppm',
    category: 'generic',
  },
  {
    panelId: 'u:presHum',
    unifiedType: 'presHum',
    label: 'Pressure & humidity',
    description: 'bme280 · pressure & humidity',
    category: 'generic',
  },
  {
    panelId: 'u:bme280Pressure',
    unifiedType: 'bme280Pressure',
    label: 'BME280 pressure',
    description: 'bme280 · pressure',
    category: 'generic',
  },
  {
    panelId: 'u:soilPot',
    unifiedType: 'soilPot',
    label: 'Soil water potential',
    description: 'teros21 · matric potential',
    category: 'generic',
  },
  {
    panelId: 'u:soilHum',
    unifiedType: 'soilHum',
    label: 'Soil humidity',
    description: 'sen0308 · humidity',
    category: 'generic',
  },
  {
    panelId: 'u:waterPress',
    unifiedType: 'waterPress',
    label: 'Water pressure',
    description: 'sen0257 · pressure',
    category: 'generic',
  },
  {
    panelId: 'u:waterFlow',
    unifiedType: 'waterFlow',
    label: 'Water flow',
    description: 'yfs210c · flow',
    category: 'generic',
  },
  {
    panelId: 'u:sensor',
    unifiedType: 'sensor',
    label: 'Dielectric permittivity',
    description: 'phytos31 · permittivity',
    category: 'generic',
  },
  {
    panelId: 'u:temperature',
    unifiedType: 'temperature',
    label: 'Temperature (BME280)',
    description: 'bme280 · temperature',
    category: 'generic',
  },
].map((entry) => ({ ...entry, kind: 'unified' }))

const ALL_ENTRIES = [...BUILTIN_CATALOG, ...UNIFIED_CATALOG]

const PANEL_ID_SET = new Set(ALL_ENTRIES.map((e) => e.panelId))

/**
 * @param {string} panelId
 * @returns {CatalogEntry | undefined}
 */
export function getCatalogEntry(panelId) {
  return ALL_ENTRIES.find((e) => e.panelId === panelId)
}

/**
 * @param {string} panelId
 */
export function isKnownPanelId(panelId) {
  return PANEL_ID_SET.has(panelId)
}

/**
 * @param {string} panelId
 * @returns {string | null}
 */
export function panelIdToUnifiedType(panelId) {
  if (!panelId.startsWith('u:')) return null
  return panelId.slice(2)
}

export {
  isLayoutPanelEntry,
  parseLayoutParam,
  serializeLayoutParam,
} from './layoutPanels'

export { ALL_ENTRIES as FULL_CATALOG }

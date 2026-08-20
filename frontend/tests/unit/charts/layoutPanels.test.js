import { describe, expect, it } from 'vitest'

import {
  isLayoutPanelEntry,
  panelIdToLayoutToken,
  parseLayoutEntry,
  parseLayoutParam,
  resolveLayoutTokenToPanelId,
  serializeLayoutParam,
  splitLayoutEntries,
} from '../../../src/pages/charts/catalog/layoutPanels'

describe('splitLayoutEntries', () => {
  it('splits comma-separated layout entries', () => {
    expect(splitLayoutEntries('vwc,temp,co2')).toEqual(['vwc', 'temp', 'co2'])
  })

  it('does not split commas inside parentheses', () => {
    expect(splitLayoutEntries('vwc,(1:vwc + 1:temp),temp')).toEqual([
      'vwc',
      '(1:vwc + 1:temp)',
      'temp',
    ])
  })

  it('trims whitespace and ignores empty entries', () => {
    expect(splitLayoutEntries(' vwc, , temp, ')).toEqual(['vwc', 'temp'])
  })
})

describe('resolveLayoutTokenToPanelId', () => {
  it('returns known panel IDs unchanged', () => {
    expect(resolveLayoutTokenToPanelId('teros')).toBe('teros')
    expect(resolveLayoutTokenToPanelId('power-vi')).toBe('power-vi')
  })

  it('maps short built-in names to panel IDs', () => {
    expect(resolveLayoutTokenToPanelId('vwc')).toBe('teros')
    expect(resolveLayoutTokenToPanelId('vi')).toBe('power-vi')
    expect(resolveLayoutTokenToPanelId('power')).toBe('power-p')
  })

  it('maps a unified chart token to its panel ID', () => {
    expect(resolveLayoutTokenToPanelId('co2')).toBe('u:co2')
    expect(resolveLayoutTokenToPanelId('presHum')).toBe('u:presHum')
  })

  it('returns null for an unknown token', () => {
    expect(resolveLayoutTokenToPanelId('unknown-panel')).toBeNull()
  })

  it('returns null for a missing token', () => {
    expect(resolveLayoutTokenToPanelId(null)).toBeNull()
    expect(resolveLayoutTokenToPanelId('')).toBeNull()
  })
})

describe('parseLayoutEntry', () => {
  it('maps short layout names to panel IDs', () => {
    expect(parseLayoutEntry('vwc')).toBe('teros')
    expect(parseLayoutEntry('vi')).toBe('power-vi')
    expect(parseLayoutEntry('co2')).toBe('u:co2')
  })

  it('trims whitespace around an entry', () => {
    expect(parseLayoutEntry('  vwc  ')).toBe('teros')
  })

  it('returns null for blank and unknown entries', () => {
    expect(parseLayoutEntry('')).toBeNull()
    expect(parseLayoutEntry('   ')).toBeNull()
    expect(parseLayoutEntry('unknown-panel')).toBeNull()
  })
})

describe('parseLayoutParam', () => {
  it('parses a layout containing short panel names', () => {
    expect(parseLayoutParam('vwc,temp,co2')).toEqual(['teros', 'temp', 'u:co2'])
  })

  it('accepts the legacy v1 prefix', () => {
    expect(parseLayoutParam('v1:teros,temp,presHum')).toEqual([
      'teros',
      'temp',
      'u:presHum',
    ])
  })

  it('ignores unknown and derived entries', () => {
    const raw = 'vwc,temp,1:vwc / 1:temp,unknown-panel'

    expect(parseLayoutParam(raw)).toEqual(['teros', 'temp'])
  })

  it('returns an empty array for missing or invalid input', () => {
    expect(parseLayoutParam()).toEqual([])
    expect(parseLayoutParam(null)).toEqual([])
    expect(parseLayoutParam('')).toEqual([])
    expect(parseLayoutParam(42)).toEqual([])
  })

  it('returns an empty array when no entries are recognized', () => {
    expect(parseLayoutParam('unknown,1:vwc / 1:temp')).toEqual([])
  })
})

describe('panelIdToLayoutToken', () => {
  it('maps built-in panel IDs to short layout names', () => {
    expect(panelIdToLayoutToken('teros')).toBe('vwc')
    expect(panelIdToLayoutToken('power-vi')).toBe('vi')
    expect(panelIdToLayoutToken('power-p')).toBe('power')
    expect(panelIdToLayoutToken('temp')).toBe('temp')
  })

  it('removes the prefix from unified panel IDs', () => {
    expect(panelIdToLayoutToken('u:co2')).toBe('co2')
    expect(panelIdToLayoutToken('u:presHum')).toBe('presHum')
  })

  it('returns an unknown panel ID unchanged', () => {
    expect(panelIdToLayoutToken('unknown-panel')).toBe('unknown-panel')
  })
})

describe('serializeLayoutParam', () => {
  it('uses the v1 prefix and short panel names', () => {
    const panelOrder = ['power-vi', 'teros', 'temp', 'u:presHum']

    expect(serializeLayoutParam(panelOrder)).toBe('v1:vi,vwc,temp,presHum')
  })

  it('filters unknown and derived panel IDs', () => {
    const panelOrder = ['power-vi', '1:vwc / 1:temp', 'unknown-panel', 'teros']

    expect(serializeLayoutParam(panelOrder)).toBe('v1:vi,vwc')
  })

  it('returns null when there are no known panels', () => {
    expect(serializeLayoutParam([])).toBeNull()
    expect(serializeLayoutParam(['unknown-panel', '1:vwc / 1:temp'])).toBeNull()
  })

  it('round-trips a valid catalog panel layout', () => {
    const panelOrder = ['teros', 'temp', 'u:co2']
    const serialized = serializeLayoutParam(panelOrder)

    expect(serialized).toBe('v1:vwc,temp,co2')
    expect(parseLayoutParam(serialized)).toEqual(panelOrder)
  })
})

describe('isLayoutPanelEntry', () => {
  it('recognizes known and aliased panel entries', () => {
    expect(isLayoutPanelEntry('teros')).toBe(true)
    expect(isLayoutPanelEntry('vwc')).toBe(true)
    expect(isLayoutPanelEntry('co2')).toBe(true)
  })

  it('rejects unknown and derived entries', () => {
    expect(isLayoutPanelEntry('unknown-panel')).toBe(false)
    expect(isLayoutPanelEntry('1:vwc / 1:temp')).toBe(false)
    expect(isLayoutPanelEntry('')).toBe(false)
  })
})

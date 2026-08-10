import { describe, expect, it } from 'vitest'

import {
  extractUnifiedStreamValue,
  matchesSensorStreamType,
  measurementMatches,
  normalizeUnifiedStreamValue,
} from '../../../src/pages/charts/components/unifiedChartUtils'

describe('measurementMatches', () => {
  it('matches measurement names exactly', () => {
    expect(measurementMatches('Temperature', ['Temperature'])).toBe(true)
  })

  it('matches measurement names without regard to case', () => {
    expect(measurementMatches('temperature', ['Temperature'])).toBe(true)
  })

  it('returns false when the measurement is unsupported', () => {
    expect(
      measurementMatches('Electrical Conductivity', ['Temperature']),
    ).toBe(false)
  })

  it('returns false when the sensor measurement is missing', () => {
    expect(measurementMatches(null, ['Temperature'])).toBe(false)
  })

  it('returns false when the configured measurements are not an array', () => {
    expect(measurementMatches('Temperature', null)).toBe(false)
  })
})

describe('matchesSensorStreamType', () => {
  it('matches exact type names', () => {
    expect(matchesSensorStreamType('bme280', 'bme280')).toBe(true)
  })

  it('matches exact type names without regard to case', () => {
    expect(matchesSensorStreamType('BME280', 'bme280')).toBe(true)
  })

  it('matches typed power stream events to power chart configurations', () => {
    expect(matchesSensorStreamType('power', 'POWER_VOLTAGE')).toBe(true)
    expect(matchesSensorStreamType('power', 'POWER_CURRENT')).toBe(true)
  })

  it('matches typed TEROS stream events to TEROS12 chart configurations', () => {
    expect(matchesSensorStreamType('teros12', 'TEROS12_VWC')).toBe(true)
    expect(matchesSensorStreamType('teros12', 'TEROS12_VWC_ADJ')).toBe(true)
  })

  it('does not match an unrelated sensor stream type', () => {
    expect(matchesSensorStreamType('co2', 'POWER_VOLTAGE')).toBe(false)
  })

  it('returns false when the measurement type is missing', () => {
    expect(matchesSensorStreamType(null, 'bme280')).toBe(false)
  })

  it('returns false when the sensor name is missing', () => {
    expect(matchesSensorStreamType('bme280', null)).toBe(false)
  })
})

describe('extractUnifiedStreamValue', () => {
  it('extracts adjusted VWC from the vwcAdj alias', () => {
    const value = extractUnifiedStreamValue(
      'TEROS12_VWC_ADJ',
      'Volumetric Water Content',
      {
        vwcAdj: 0.42,
      },
    )

    expect(value).toBe(0.42)
  })

  it('extracts raw VWC from the vwcRaw alias', () => {
    const value = extractUnifiedStreamValue(
      'TEROS12_VWC',
      'Volumetric Water Content',
      {
        vwcRaw: 1234,
      },
    )

    expect(value).toBe(1234)
  })

  it('extracts raw VWC from the raw measurement name', () => {
    const value = extractUnifiedStreamValue(
      'TEROS12_VWC',
      'Volumetric Water Content (Raw)',
      {
        'Volumetric Water Content (Raw)': 2145.8,
      },
    )

    expect(value).toBe(2145.8)
  })

  it('extracts CO2 from the legacy uppercase key', () => {
    const value = extractUnifiedStreamValue('co2', 'co2', {
      CO2: 800,
    })

    expect(value).toBe(800)
  })

  it('extracts a value using the supplied measurement label', () => {
    const value = extractUnifiedStreamValue('bme280', 'pressure', {
      pressure: 1013.25,
    })

    expect(value).toBe(1013.25)
  })

  it('returns zero when a matching measurement has a zero value', () => {
    const value = extractUnifiedStreamValue('co2', 'co2', {
      co2: 0,
    })

    expect(value).toBe(0)
  })

  it('returns null when measurement data is missing', () => {
    const value = extractUnifiedStreamValue(
      'TEROS12_VWC',
      'Volumetric Water Content',
      null,
    )

    expect(value).toBeNull()
  })

  it('returns null when measurement data is not an object', () => {
    const value = extractUnifiedStreamValue(
      'TEROS12_VWC',
      'Volumetric Water Content',
      0.42,
    )

    expect(value).toBeNull()
  })

  it('returns null when no matching key exists', () => {
    const value = extractUnifiedStreamValue('co2', 'co2', {
      temperature: 22,
    })

    expect(value).toBeNull()
  })
})

describe('normalizeUnifiedStreamValue', () => {
  it('converts adjusted fractional VWC to a percentage', () => {
    const normalized = normalizeUnifiedStreamValue(
      'TEROS12_VWC_ADJ',
      'Volumetric Water Content',
      0.42,
    )

    expect(normalized).toBe(42)
  })

  it('converts the adjusted VWC boundary value one to one hundred', () => {
    const normalized = normalizeUnifiedStreamValue(
      'TEROS12_VWC_ADJ',
      'Volumetric Water Content',
      1,
    )

    expect(normalized).toBe(100)
  })

  it('does not double-scale adjusted percentage VWC', () => {
    const normalized = normalizeUnifiedStreamValue(
      'TEROS12_VWC_ADJ',
      'Volumetric Water Content',
      42,
    )

    expect(normalized).toBe(42)
  })

  it('returns null for non-finite adjusted VWC values', () => {
    const normalized = normalizeUnifiedStreamValue(
      'TEROS12_VWC_ADJ',
      'Volumetric Water Content',
      Number.NaN,
    )

    expect(normalized).toBeNull()
  })

  it('leaves non-VWC measurements unchanged', () => {
    const normalized = normalizeUnifiedStreamValue('co2', 'co2', 800)

    expect(normalized).toBe(800)
  })

  it('does not normalize raw VWC values', () => {
    const normalized = normalizeUnifiedStreamValue(
      'TEROS12_VWC',
      'Volumetric Water Content',
      0.42,
    )

    expect(normalized).toBe(0.42)
  })
})
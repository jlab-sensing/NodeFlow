import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'

import { getChartTimeDomain } from '../../../src/charts/timeDomain'

describe('getChartTimeDomain', () => {
  it('returns the start and end times as the chart domain', () => {
    const start = DateTime.fromISO('2026-01-01T08:00:00Z')
    const end = DateTime.fromISO('2026-01-01T10:00:00Z')

    expect(getChartTimeDomain(start, end)).toEqual({
      min: start.toMillis(),
      max: end.toMillis(),
    })
  })

  it('orders the domain when the dates are reversed', () => {
    const earlier = DateTime.fromISO('2026-01-01T08:00:00Z')
    const later = DateTime.fromISO('2026-01-01T10:00:00Z')

    expect(getChartTimeDomain(later, earlier)).toEqual({
      min: earlier.toMillis(),
      max: later.toMillis(),
    })
  })

  it('returns an empty object when dates are missing', () => {
    expect(getChartTimeDomain()).toEqual({})
  })

  it('returns an empty object when the start date is invalid', () => {
    const invalidStart = DateTime.invalid('invalid start date')
    const validEnd = DateTime.fromISO('2026-01-01T10:00:00Z')
    expect(getChartTimeDomain(invalidStart, validEnd)).toEqual({})
  })

  it('returns an empty object when the end date is invalid', () => {
    const validStart = DateTime.fromISO('2026-01-01T10:00:00Z')
    const invalidEnd = DateTime.invalid('invalid end date')
    expect(getChartTimeDomain(validStart, invalidEnd)).toEqual({})
  })

  it('returns an empty object when the end date is missing', () => {
    const start = DateTime.fromISO('2026-01-01T10:00:00Z')
    expect(getChartTimeDomain(start, null)).toEqual({})
  })

  it('returns an empty object when the start date is missing', () => {
    const end = DateTime.fromISO('2026-01-01T10:00:00Z')
    expect(getChartTimeDomain(null, end)).toEqual({})
  })

  it('returns an empty object for values without toMillis', () => {
    const end = DateTime.fromISO('2026-01-01T10:00:00Z')
    expect(getChartTimeDomain('2026-01-01T10:00:00Z', end)).toEqual({})
  })

  it('returns an empty object when conversion produces NaN', () => {
    const invalidDateValue = {
        isValid: true,
        toMillis: () => NaN,
    }
    const end = DateTime.fromISO('2026-01-01T10:00:00Z')
    expect(getChartTimeDomain(invalidDateValue, end)).toEqual({})
  })

  it('allows the start and end to represent the same time', () => {
    const start = DateTime.fromISO('2026-01-01T10:00:00Z')
    expect(getChartTimeDomain(start, start)).toEqual({
        min: start.toMillis(),
        max: start.toMillis(),
    })
  })
})


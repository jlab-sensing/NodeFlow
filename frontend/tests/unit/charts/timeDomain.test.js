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
})

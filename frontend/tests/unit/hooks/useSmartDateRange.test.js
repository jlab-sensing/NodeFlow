import { act, renderHook, waitFor } from '@testing-library/react'
import { DateTime } from 'luxon'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSmartDateRange } from '../../../src/hooks/useSmartDateRange'
import { getSensorDataAvailability } from '../../../src/services/dataAvailability'

vi.mock('../../../src/services/dataAvailability', () => ({
  getSensorDataAvailability: vi.fn(),
}))

describe('useSmartDateRange', () => {
  const axiosPrivate = {}

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the latest available timestamp for a two-week window when recent data exists', async () => {
    const latest = DateTime.fromISO('2025-11-24T12:00:00Z')

    getSensorDataAvailability.mockResolvedValue({
      latest_timestamp: latest.toISO(),
      earliest_timestamp: '2025-01-01T00:00:00Z',
      has_recent_data: true,
    })

    const { result } = renderHook(() => useSmartDateRange(axiosPrivate))

    let output

    await act(async () => {
      output = await result.current.calculateSmartDateRange(['sensor-10'])
    })

    expect(getSensorDataAvailability).toHaveBeenCalledWith(axiosPrivate, [
      'sensor-10',
    ])
    expect(output.isFallback).toBe(false)
    expect(output.endDate.toMillis()).toBe(latest.toMillis())
    expect(output.startDate.toMillis()).toBe(
      latest.minus({ days: 14 }).toMillis(),
    )
  })

  it('clamps the start date to the earliest available timestamp', async () => {
    const latest = DateTime.fromISO('2025-02-10T00:00:00Z')
    const earliest = DateTime.fromISO('2025-02-05T00:00:00Z')

    getSensorDataAvailability.mockResolvedValue({
      latest_timestamp: latest.toISO(),
      earliest_timestamp: earliest.toISO(),
      has_recent_data: true,
    })

    const { result } = renderHook(() => useSmartDateRange(axiosPrivate))

    let output

    await act(async () => {
      output = await result.current.calculateSmartDateRange(['sensor-11'])
    })

    expect(output.isFallback).toBe(false)
    expect(output.endDate.toMillis()).toBe(latest.toMillis())
    expect(output.startDate.toMillis()).toBe(earliest.toMillis())
  })

  it('returns a fallback window and stores notification dates when recent data does not exist', async () => {
    const latest = DateTime.fromISO('2025-01-20T06:30:00Z')

    getSensorDataAvailability.mockResolvedValue({
      latest_timestamp: latest.toISO(),
      earliest_timestamp: '2024-01-01T00:00:00Z',
      has_recent_data: false,
    })

    const { result } = renderHook(() => useSmartDateRange(axiosPrivate))

    let output

    await act(async () => {
      output = await result.current.calculateSmartDateRange(['sensor-12'])
    })

    expect(output.isFallback).toBe(true)
    expect(output.endDate.toMillis()).toBe(latest.toMillis())
    expect(output.startDate.toMillis()).toBe(
      latest.minus({ days: 14 }).toMillis(),
    )

    await waitFor(() => {
      expect(result.current.fallbackDates.start).not.toBeNull()
      expect(result.current.fallbackDates.end).not.toBeNull()
    })

    expect(
      DateTime.fromJSDate(result.current.fallbackDates.end).toMillis(),
    ).toBe(latest.toMillis())
  })

  it('returns the default range when the latest timestamp is invalid', async () => {
    vi.useFakeTimers()

    const now = DateTime.fromISO('2026-08-10T12:00:00Z')
    vi.setSystemTime(now.toJSDate())

    getSensorDataAvailability.mockResolvedValue({
      latest_timestamp: 'invalid',
      earliest_timestamp: null,
      has_recent_data: true,
    })

    const { result } = renderHook(() => useSmartDateRange(axiosPrivate))

    let output

    await act(async () => {
      output = await result.current.calculateSmartDateRange(['sensor-13'])
    })

    expect(output.isFallback).toBe(false)
    expect(output.endDate.toMillis()).toBe(now.toMillis())
    expect(output.startDate.toMillis()).toBe(now.minus({ days: 14 }).toMillis())
  })
})

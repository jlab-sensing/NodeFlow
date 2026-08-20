import { describe, it, expect } from 'vitest'
import { getVwcAxisBounds } from '../../../src/charts/VwcChart/vwcAxis'

describe('getVwcAxisBounds', () => {
  it('returns the default VWC ais when there are no datasets', () => {
    const dataset = []
    const result = getVwcAxisBounds(dataset)

    expect(result).toEqual({
      min: 0,
      max: 50,
      step: 5,
    })
  })

  it('keeps default max when all values are below 50', () => {
    const datasets = [
      {
        data: [{ y: 10 }, { y: 25 }, { y: 45 }],
      },
    ]

    const result = getVwcAxisBounds(datasets)

    expect(result).toEqual({
      min: 0,
      max: 50,
      step: 5,
    })
  })

  it('adds deadroom when the observed maximum is greater than 50', () => {
    const datasets = [
      {
        data: [{ y: 25 }, { y: 60 }],
      },
    ]

    const result = getVwcAxisBounds(datasets)
    expect(result).toEqual({
      min: 0,
      max: 62,
      step: 7,
    })
  })

  it('keeps max at 50 when the max is 50', () => {
    const datasets = [
      {
        data: [{ y: 25 }, { y: 50 }],
      },
    ]

    const result = getVwcAxisBounds(datasets)
    expect(result).toEqual({
      min: 0,
      max: 50,
      step: 5,
    })
  })

  it('points without y are ignored', () => {
    const datasets = [
      {
        data: [{ y: 50 }, { x: 65 }],
      },
    ]

    const result = getVwcAxisBounds(datasets)
    expect(result).toEqual({
      min: 0,
      max: 50,
      step: 5,
    })
  })

  it('NaN and infinity are ignored', () => {
    const datasets = [
      {
        data: [{ y: NaN }, { y: 50 }, { y: Infinity }],
      },
    ]
    const result = getVwcAxisBounds(datasets)
    expect(result).toEqual({
      min: 0,
      max: 50,
      step: 5,
    })
  })

  it('changes the step based on a custom tick count', () => {
    const datasets = [
      {
        data: [{ y: 10 }, { y: 25 }],
      },
    ]
    const result = getVwcAxisBounds(datasets, 5)
    expect(result).toEqual({
      min: 0,
      max: 50,
      step: 10,
    })
  })

  it('never returns a step less than one', () => {
    const datasets = [
      {
        data: [{ y: 10 }, { y: 25 }],
      },
    ]
    const result = getVwcAxisBounds(datasets, 100)
    expect(result).toEqual({
      min: 0,
      max: 50,
      step: 1,
    })
  })
})

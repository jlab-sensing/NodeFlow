import { describe, expect, it } from 'vitest'
import { toPercentIfFraction } from '../../../src/charts/VwcChart/vwcValue'

describe('vwcValue', () => {
  it('turns a valid fractional float into a VWC percentage', () => {
    const floatFraction = 0.25
    expect(toPercentIfFraction(floatFraction)).toBe(25)
  })

  it('turns a valid fractional integer (1) into a VWC percentage', () => {
    const intFraction = 1
    expect(toPercentIfFraction(intFraction)).toBe(100)
  })

  it('keeps an 0 as 0', () => {
    const zero = 0
    expect(toPercentIfFraction(zero)).toBe(0)
  })

  it('keeps a value greater than one unchanged', () => {
    const valueGreaterThanOne = 1.01
    expect(toPercentIfFraction(valueGreaterThanOne)).toBe(1.01)
  })

  it('returns null for a missing value', () => {
    expect(toPercentIfFraction()).toBeNull()
  })

  it('infinity returns null', () => {
    const inf = Infinity
    expect(toPercentIfFraction(inf)).toBeNull()
  })

  it('negative infinity returns null', () => {
    const minusInf = -Infinity
    expect(toPercentIfFraction(minusInf)).toBeNull()
  })

  it('null returns null', () => {
    const nothing = null
    expect(toPercentIfFraction(nothing)).toBeNull()
  })

  it('strings return null', () => {
    const numericString = '0.5'
    expect(toPercentIfFraction(numericString)).toBeNull()
  })

  it('negative finite numbers are not changed', () => {
    const negNumber = -1
    expect(toPercentIfFraction(negNumber)).toBe(-1)
  })

  it('NaN returns null', () => {
    const nothing = NaN
    expect(toPercentIfFraction(nothing)).toBeNull()
  })
})

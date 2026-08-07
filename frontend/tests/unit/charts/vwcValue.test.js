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
    expect(toPercentIfFraction(valueGreaterThanOne)).toEqual(1.01)
  })

})
import { servingCount, compatibleUnits } from '@/utils/quantities'

it('scales explicit reference amounts and compatible mass units', () => {
  const ref = { serving_amount: 100, serving_unit: 'g' }
  expect(servingCount(182, 'g', ref)).toBeCloseTo(1.82)
  expect(servingCount(1, 'kg', ref)).toBe(10)
  expect(servingCount(1, 'oz', ref)).toBeCloseTo(.28349523125)
  expect(servingCount(2, 'serving', ref)).toBe(2)
})
it('uses US volumes but never density or item-weight guesses', () => {
  expect(servingCount(3, 'tsp', { serving_amount: 1, serving_unit: 'tbsp' })).toBeCloseTo(1)
  expect(servingCount(1, 'ml', { serving_amount: 1, serving_unit: 'g' })).toBe(0)
  expect(servingCount(1, 'item', { serving_amount: 100, serving_unit: 'g' })).toBe(0)
  expect(compatibleUnits('g')).toEqual(['g', 'kg', 'oz', 'lb', 'serving'])
  expect(compatibleUnits(null)).toEqual(['serving'])
})

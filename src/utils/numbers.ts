import Decimal from './decimal'

export function d(value?: Decimal.Value): Decimal.Instance {
  if (Decimal.isDecimal(value)) {
    return value as Decimal
  }

  return new Decimal(value === undefined ? 0 : value)
}


export function isNumber(value: string | number): boolean {
  // eslint-disable-next-line no-restricted-globals
  return value != null && value !== '' && !isNaN(Number(value.toString()))
}

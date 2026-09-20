const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function isValidKobo(value) {
  return Number.isSafeInteger(value) && value >= 0
}

export function formatNaira(priceKobo) {
  if (!isValidKobo(priceKobo)) throw new Error('Invalid Naira amount.')
  return nairaFormatter.format(priceKobo / 100)
}

export function calculateLicenceUpliftKobo(basePriceKobo, upliftPercent) {
  if (!isValidKobo(basePriceKobo) || !Number.isSafeInteger(upliftPercent) || upliftPercent < 0 || upliftPercent > 100) throw new Error('Invalid licence price.')
  return Math.floor((basePriceKobo * upliftPercent + 50) / 100)
}

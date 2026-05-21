export type AddOnPricingType = 'PER_BOOKING' | 'PER_PERSON' | 'PER_DAY'

export type AddOnRow = {
  id: string
  name: string
  type: AddOnPricingType
  price: number
  is_active: boolean
}

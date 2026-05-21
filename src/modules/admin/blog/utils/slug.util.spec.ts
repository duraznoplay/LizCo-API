import { generateSlug } from './slug.util'

describe('generateSlug', () => {
  it('converts basic title to kebab-case', () => {
    expect(generateSlug('Mi Post de Blog')).toBe('mi-post-de-blog')
  })

  it('removes spanish accents/tildes', () => {
    expect(generateSlug('Cartagena: Playas y Diversión')).toBe('cartagena-playas-y-diversion')
  })

  it('removes special characters keeping hyphens', () => {
    expect(generateSlug('Guía & Tips #2 para Viajeros!')).toBe('guia-tips-2-para-viajeros')
  })

  it('collapses multiple spaces and hyphens', () => {
    expect(generateSlug('Título   con   espacios')).toBe('titulo-con-espacios')
  })

  it('trims leading and trailing hyphens', () => {
    expect(generateSlug('  Título con espacios  ')).toBe('titulo-con-espacios')
  })

  it('truncates to 100 characters', () => {
    const long = 'a'.repeat(200)
    expect(generateSlug(long).length).toBeLessThanOrEqual(100)
  })

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('')
  })

  it('handles string with only special chars', () => {
    expect(generateSlug('!@#$%^&*()')).toBe('')
  })

  it('preserves hyphens already in the title', () => {
    expect(generateSlug('Coffee-Region Travel')).toBe('coffee-region-travel')
  })

  it('handles purely numeric title', () => {
    expect(generateSlug('2026 Travel Guide')).toBe('2026-travel-guide')
  })
})

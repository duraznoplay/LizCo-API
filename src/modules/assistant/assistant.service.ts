import { Injectable } from '@nestjs/common'
import {
  ENTERPRISE_TOURS_SCHEMA,
  SupabaseAdminService,
} from '../../supabase/supabase-admin.service'
import type { AssistantTourCatalog, AssistantTourCatalogResponseDto } from './dto/assistant.dto'

function isTourCatalogIntent(message: string): boolean {
  return /tour|tours|paquete|paquetes|package|precio|price|usd|destino|destinos|itinerar|d[ií]as|noche|night|booking|reserv|disponib|catalog|catálogo|colombia.*travel|viaj/i.test(
    message,
  )
}

@Injectable()
export class AssistantService {
  constructor(private readonly supa: SupabaseAdminService) {}

  async tourCatalog(body: AssistantTourCatalog): Promise<AssistantTourCatalogResponseDto> {
    if (!isTourCatalogIntent(body.message)) {
      return { ok: true as const, usedDb: false, reply: '' }
    }

    const [{ data: destRows, error: de }, { data: pkgRows, error: pe }] = await Promise.all([
      this.supa.client
        .schema(ENTERPRISE_TOURS_SCHEMA)
        .from('destinations')
        .select('name, slug, description')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      this.supa.client
        .schema(ENTERPRISE_TOURS_SCHEMA)
        .from('packages')
        .select('name, slug, base_price, duration_days, duration_nights, destinations(name, slug)')
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ])

    if (de || pe) {
      return { ok: false as const, error: 'internal_error' }
    }

    const lang = body.language
    const intro =
      lang === 'es'
        ? 'Aquí tienes el catálogo actual desde nuestra base de datos (precios base en USD por persona, salvo nota):'
        : lang === 'fr'
          ? 'Voici le catalogue actuel depuis notre base de données (prix de base USD par personne, sauf mention contraire):'
          : 'Here is the live catalog from our database (base prices in USD per person unless noted):'

    const destLines = (destRows ?? [])
      .map((d) => `• **${d.name}** (/destinations/${d.slug}) — ${String(d.description).slice(0, 140)}…`)
      .join('\n')

    const pkgLines = (pkgRows ?? [])
      .map((p: { name: string; slug: string; base_price: number; duration_days: number; duration_nights: number; destinations?: { name?: string } | { name?: string }[] | null }) => {
        const rel = p.destinations
        const d = Array.isArray(rel) ? rel[0] : rel
        const dest = d?.name ?? '—'
        return `• **${p.name}** — ${dest} — **${p.duration_days}D/${p.duration_nights}N** — from **USD ${Number(p.base_price).toFixed(2)}** — slug \`${p.slug}\``
      })
      .join('\n')

    const reply = `${intro}\n\n**Destinations**\n${destLines || '—'}\n\n**Packages**\n${pkgLines || '—'}\n\n_Reservations: use the Booking page to apply season multipliers and add-ons._`

    return { ok: true as const, usedDb: true, reply }
  }
}

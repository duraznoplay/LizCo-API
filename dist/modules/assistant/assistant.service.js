"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantService = void 0;
const common_1 = require("@nestjs/common");
const supabase_admin_service_1 = require("../../supabase/supabase-admin.service");
function isTourCatalogIntent(message) {
    return /tour|tours|paquete|paquetes|package|precio|price|usd|destino|destinos|itinerar|d[ií]as|noche|night|booking|reserv|disponib|catalog|catálogo|colombia.*travel|viaj/i.test(message);
}
let AssistantService = class AssistantService {
    supa;
    constructor(supa) {
        this.supa = supa;
    }
    async tourCatalog(body) {
        if (!isTourCatalogIntent(body.message)) {
            return { ok: true, usedDb: false, reply: '' };
        }
        const [{ data: destRows, error: de }, { data: pkgRows, error: pe }] = await Promise.all([
            this.supa.client
                .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
                .from('destinations')
                .select('name, slug, description')
                .eq('is_active', true)
                .order('name', { ascending: true }),
            this.supa.client
                .schema(supabase_admin_service_1.ENTERPRISE_TOURS_SCHEMA)
                .from('packages')
                .select('name, slug, base_price, duration_days, duration_nights, destinations(name, slug)')
                .eq('is_active', true)
                .order('name', { ascending: true }),
        ]);
        if (de || pe) {
            return { ok: false, error: 'internal_error' };
        }
        const lang = body.language;
        const intro = lang === 'es'
            ? 'Aquí tienes el catálogo actual desde nuestra base de datos (precios base en USD por persona, salvo nota):'
            : lang === 'fr'
                ? 'Voici le catalogue actuel depuis notre base de données (prix de base USD par personne, sauf mention contraire):'
                : 'Here is the live catalog from our database (base prices in USD per person unless noted):';
        const destLines = (destRows ?? [])
            .map((d) => `• **${d.name}** (/destinations/${d.slug}) — ${String(d.description).slice(0, 140)}…`)
            .join('\n');
        const pkgLines = (pkgRows ?? [])
            .map((p) => {
            const rel = p.destinations;
            const d = Array.isArray(rel) ? rel[0] : rel;
            const dest = d?.name ?? '—';
            return `• **${p.name}** — ${dest} — **${p.duration_days}D/${p.duration_nights}N** — from **USD ${Number(p.base_price).toFixed(2)}** — slug \`${p.slug}\``;
        })
            .join('\n');
        const reply = `${intro}\n\n**Destinations**\n${destLines || '—'}\n\n**Packages**\n${pkgLines || '—'}\n\n_Reservations: use the Booking page to apply season multipliers and add-ons._`;
        return { ok: true, usedDb: true, reply };
    }
};
exports.AssistantService = AssistantService;
exports.AssistantService = AssistantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_admin_service_1.SupabaseAdminService])
], AssistantService);
//# sourceMappingURL=assistant.service.js.map
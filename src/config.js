// Endereço do projeto "rotina" no Supabase e chave pública (publishable).
// A chave publishable é feita para ficar no site; NUNCA coloque aqui a chave "secret".
// No Cloudflare dá para sobrescrever com as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_KEY.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://faachjuysscpxxzmveeg.supabase.co'

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_tlspc3ka6eMKKcUi-kjoFg_OvBBQBr2'

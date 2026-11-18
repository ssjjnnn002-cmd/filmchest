// 기본 목록(web/src/core/films.ts · FilmStockCatalog.swift)에 더하는 필름.
// 지금 살 수 있는 필름 + 단종됐지만 유통기한 지난 재고로 아직 구할 수 있는 필름(disc: true).
// 단종 표시는 단종이 확실한 것만 (지역에 따라 아직 파는 필름은 표시하지 않음)
// 고친 뒤 `node catalog/generate-films.mjs` → web/src/core/filmData.ts, FilmStockCatalogMore.swift 생성
//
// [id, 브랜드, 이름, ISO, 현상, 규격, [바탕, 띠, 글자, 띠 글자, 뚜껑?], disc?]
// 규격: 35 = 35mm만 · 120 = 120만 · both = 35mm·120 · sheets = 35mm·120·4×5·8×10 · 110
// 색은 실제 패키지의 대표 색을 참고한 근사값 (그림은 앱에서 새로 그린다)

const W = '#F5F5F2', K = '#1B1B1B', Y = '#FDB913', CAP = '#111111'

export const moreFilms = [
  // ── Kodak (지금 판매)
  ['kodak-proimage-100', 'Kodak', 'Pro Image 100', 100, 'C-41', '35', [Y, '#D2232A', K, '#FFFFFF']],
  ['kodak-kodacolor-100', 'Kodak', 'Kodacolor 100', 100, 'C-41', '35', [Y, '#E87722', K, '#FFFFFF']],
  ['kodak-kodacolor-200', 'Kodak', 'Kodacolor 200', 200, 'C-41', '35', [Y, '#2E8B57', K, '#FFFFFF']],
  ['kodak-tmax-p3200', 'Kodak', 'T-Max P3200', 3200, 'B&W', '35', [Y, '#5A2D82', K, '#FFFFFF']],
  ['kodak-double-x', 'Kodak', 'Double-X 5222', 250, 'B&W', '35', ['#2A2A2A', '#9A9A9A', '#F2F2F2', K]],
  ['kodak-vision3-50d', 'Kodak', 'Vision3 50D', 50, 'ECN-2', '35', ['#2A2A2A', '#F2C94C', '#F2F2F2', K]],
  ['kodak-vision3-200t', 'Kodak', 'Vision3 200T', 200, 'ECN-2', '35', ['#2A2A2A', '#5BA3E0', '#F2F2F2', K]],
  // ── Kodak (단종, 기한 지난 재고)
  ['kodak-portra-160nc', 'Kodak', 'Portra 160NC', 160, 'C-41', 'both', ['#F4EFE4', '#C98B3A', '#3A2E22', '#FFFFFF'], true],
  ['kodak-portra-160vc', 'Kodak', 'Portra 160VC', 160, 'C-41', 'both', ['#F4EFE4', '#C8102E', '#3A2E22', '#FFFFFF'], true],
  ['kodak-portra-400nc', 'Kodak', 'Portra 400NC', 400, 'C-41', 'both', ['#F4EFE4', '#B8860B', '#3A2E22', '#FFFFFF'], true],
  ['kodak-portra-400vc', 'Kodak', 'Portra 400VC', 400, 'C-41', 'both', ['#F4EFE4', '#A31F34', '#3A2E22', '#FFFFFF'], true],
  ['kodak-portra-400uc', 'Kodak', 'Portra 400UC', 400, 'C-41', 'both', ['#F4EFE4', '#7B2D8E', '#3A2E22', '#FFFFFF'], true],
  ['kodak-ektar-25', 'Kodak', 'Ektar 25', 25, 'C-41', '35', [Y, '#8B1A1A', K, '#FFFFFF'], true],
  ['kodak-gold-100', 'Kodak', 'Gold 100', 100, 'C-41', '35', [Y, '#E2231A', K, '#FFFFFF'], true],
  ['kodak-max-800', 'Kodak', 'Max 800', 800, 'C-41', '35', [Y, '#1B1B1B', K, Y], true],
  ['kodak-ektacolor-pro-160', 'Kodak', 'Ektacolor Pro 160', 160, 'C-41', '120', ['#F4EFE4', '#6B8E23', '#3A2E22', '#FFFFFF'], true],
  ['kodak-bw400cn', 'Kodak', 'BW400CN', 400, 'C-41', '35', ['#F4EFE4', K, K, '#FFFFFF'], true],
  ['kodak-plus-x-125', 'Kodak', 'Plus-X 125', 125, 'B&W', 'both', [Y, '#2E5AA8', K, '#FFFFFF'], true],
  ['kodak-ektachrome-e100vs', 'Kodak', 'Ektachrome E100VS', 100, 'E-6', 'both', [K, '#C8102E', '#FFFFFF', '#FFFFFF'], true],
  ['kodak-ektachrome-e100g', 'Kodak', 'Ektachrome E100G', 100, 'E-6', 'both', [K, '#2E8B57', '#FFFFFF', '#FFFFFF'], true],
  ['kodak-elite-chrome-100', 'Kodak', 'Elite Chrome 100', 100, 'E-6', '35', [K, '#1F4E9C', '#FFFFFF', '#FFFFFF'], true],

  // ── Fujifilm (단종, 기한 지난 재고)
  ['fuji-superia-200', 'Fujifilm', 'Superia 200', 200, 'C-41', '35', ['#0C8A4B', '#E2231A', '#FFFFFF', '#FFFFFF']],
  ['fuji-superia-800', 'Fujifilm', 'Superia 800', 800, 'C-41', '35', ['#0C8A4B', '#5A2D82', '#FFFFFF', '#FFFFFF'], true],
  ['fuji-superia-1600', 'Fujifilm', 'Superia 1600', 1600, 'C-41', '35', ['#0C8A4B', K, '#FFFFFF', '#FFFFFF'], true],
  ['fuji-superia-venus-800', 'Fujifilm', 'Superia Venus 800', 800, 'C-41', '35', ['#C2185B', '#F5F5F2', '#FFFFFF', '#C2185B'], true],
  ['fuji-superia-reala-100', 'Fujifilm', 'Superia Reala 100', 100, 'C-41', 'both', ['#0C8A4B', '#1F4E9C', '#FFFFFF', '#FFFFFF'], true],
  ['fuji-natura-1600', 'Fujifilm', 'Natura 1600', 1600, 'C-41', '35', [K, '#C9A227', '#F5F5F2', K, CAP], true],
  ['fuji-pro-160ns', 'Fujifilm', 'Pro 160NS', 160, 'C-41', 'both', ['#EDEDED', '#3C9DD9', K, '#FFFFFF'], true],
  ['fuji-industrial-100', 'Fujifilm', 'Fujicolor 100 Industrial', 100, 'C-41', '35', [W, '#E2231A', K, '#FFFFFF']],
  ['fuji-superia-premium-400', 'Fujifilm', 'Superia Premium 400', 400, 'C-41', '35', ['#0C8A4B', '#C9A227', '#FFFFFF', K]],
  ['fuji-neopan-acros-100', 'Fujifilm', 'Neopan Acros 100', 100, 'B&W', 'sheets', [K, '#C8102E', '#FFFFFF', '#FFFFFF', CAP], true],
  ['fuji-neopan-400', 'Fujifilm', 'Neopan 400', 400, 'B&W', 'both', [K, '#1F4E9C', '#FFFFFF', '#FFFFFF', CAP], true],
  ['fuji-neopan-1600', 'Fujifilm', 'Neopan 1600', 1600, 'B&W', '35', [K, '#5A2D82', '#FFFFFF', '#FFFFFF', CAP], true],
  ['fuji-velvia-100f', 'Fujifilm', 'Velvia 100F', 100, 'E-6', 'both', ['#7A2A82', '#C9A227', '#FFFFFF', K], true],
  ['fuji-astia-100f', 'Fujifilm', 'Astia 100F', 100, 'E-6', 'both', ['#C2185B', '#F5F5F2', '#FFFFFF', '#C2185B'], true],
  ['fuji-sensia-100', 'Fujifilm', 'Sensia 100', 100, 'E-6', '35', ['#1E4FA0', '#F2A71B', '#FFFFFF', K], true],
  ['fuji-provia-400x', 'Fujifilm', 'Provia 400X', 400, 'E-6', 'both', ['#1E4FA0', '#E2231A', '#FFFFFF', '#FFFFFF'], true],

  // ── Ilford · Kentmere · Harman
  ['ilford-sfx-200', 'Ilford', 'SFX 200', 200, 'B&W', 'both', [K, '#B22222', '#F5F5F2', '#FFFFFF', CAP]],
  ['ilford-ortho-plus', 'Ilford', 'Ortho Plus 80', 80, 'B&W', 'sheets', [K, '#2E8B57', '#F5F5F2', '#FFFFFF', CAP]],
  ['kentmere-pan-100', 'Kentmere', 'Pan 100', 100, 'B&W', '35', [W, '#1F7A8C', K, '#FFFFFF']],
  ['harman-phoenix-ii-200', 'Harman', 'Phoenix II 200', 200, 'C-41', 'both', ['#F15A22', '#F5F5F2', '#FFFFFF', '#F15A22']],

  // ── CineStill · Lomography
  ['cinestill-bwxx', 'CineStill', 'BwXX', 250, 'B&W', 'both', [K, '#9A9A9A', '#FFFFFF', K, CAP]],
  ['lomo-color-92', 'Lomography', "Color '92 400", 400, 'C-41', 'both', ['#F4C430', '#E2231A', K, '#FFFFFF']],
  ['lomo-metropolis', 'Lomography', 'LomoChrome Metropolis', 200, 'C-41', 'both', ['#3A3A3A', '#9A9A9A', '#F5F5F2', K]],
  ['lomo-turquoise', 'Lomography', 'LomoChrome Turquoise', 200, 'C-41', 'both', ['#1E9AA0', '#F2A71B', '#FFFFFF', K]],
  ['lomo-redscale-xr', 'Lomography', 'Redscale XR 50-200', 100, 'C-41', 'both', ['#B22222', '#F2A71B', '#FFFFFF', K]],
  ['lomo-earl-grey-100', 'Lomography', 'Earl Grey 100', 100, 'B&W', 'both', ['#8C8C8C', K, '#FFFFFF', '#FFFFFF']],
  ['lomo-lady-grey-400', 'Lomography', 'Lady Grey 400', 400, 'B&W', 'both', ['#B5B5B5', '#E85D9C', K, '#FFFFFF']],
  ['lomo-berlin-kino-400', 'Lomography', 'Berlin Kino 400', 400, 'B&W', 'both', [K, '#F4C430', '#F5F5F2', K, CAP]],
  ['lomo-potsdam-kino-100', 'Lomography', 'Potsdam Kino 100', 100, 'B&W', 'both', [K, '#3C9DD9', '#F5F5F2', '#FFFFFF', CAP]],
  ['lomo-babylon-kino-13', 'Lomography', 'Babylon Kino 13', 13, 'B&W', '35', [K, '#C9A227', '#F5F5F2', K, CAP]],

  // ── Rollei · Adox · AgfaPhoto
  ['rollei-retro-80s', 'Rollei', 'Retro 80S', 80, 'B&W', 'both', ['#C8102E', K, '#FFFFFF', '#FFFFFF']],
  ['rollei-retro-400s', 'Rollei', 'Retro 400S', 400, 'B&W', 'both', ['#C8102E', '#9A9A9A', '#FFFFFF', K]],
  ['rollei-rpx-25', 'Rollei', 'RPX 25', 25, 'B&W', 'both', [W, '#2E8B57', K, '#FFFFFF']],
  ['rollei-rpx-100', 'Rollei', 'RPX 100', 100, 'B&W', 'both', [W, '#1F4E9C', K, '#FFFFFF']],
  ['rollei-rpx-400', 'Rollei', 'RPX 400', 400, 'B&W', 'both', [W, '#C8102E', K, '#FFFFFF']],
  ['rollei-superpan-200', 'Rollei', 'Superpan 200', 200, 'B&W', 'both', [K, '#C8102E', '#FFFFFF', '#FFFFFF', CAP]],
  ['rollei-infrared-400', 'Rollei', 'Infrared 400', 400, 'B&W', 'both', [K, '#8B1A1A', '#FFFFFF', '#FFFFFF', CAP]],
  ['adox-chs-100-ii', 'Adox', 'CHS 100 II', 100, 'B&W', 'sheets', ['#F2A71B', K, K, '#F2A71B']],
  ['adox-silvermax-100', 'Adox', 'Silvermax 100', 100, 'B&W', '35', ['#9A9A9A', K, K, '#FFFFFF']],
  ['adox-scala-50', 'Adox', 'Scala 50', 50, 'B&W', 'both', [K, '#E2231A', '#FFFFFF', '#FFFFFF', CAP]],
  ['adox-color-mission-200', 'Adox', 'Color Mission 200', 200, 'C-41', 'both', ['#F2A71B', '#1F4E9C', K, '#FFFFFF']],
  ['agfa-apx-100', 'AgfaPhoto', 'APX 100', 100, 'B&W', 'both', [W, '#E2231A', K, '#FFFFFF']],
  ['agfa-apx-400', 'AgfaPhoto', 'APX 400', 400, 'B&W', '35', [W, '#1F4E9C', K, '#FFFFFF']],
  ['agfa-ct-precisa-100', 'AgfaPhoto', 'CT Precisa 100', 100, 'E-6', '35', ['#1F4E9C', '#E2231A', '#FFFFFF', '#FFFFFF']],
  ['agfa-vista-plus-200', 'AgfaPhoto', 'Vista Plus 200', 200, 'C-41', '35', ['#E2231A', '#F2A71B', '#FFFFFF', K], true],
  ['agfa-vista-plus-400', 'AgfaPhoto', 'Vista Plus 400', 400, 'C-41', '35', ['#E2231A', '#1F4E9C', '#FFFFFF', '#FFFFFF'], true],
  ['agfa-ultra-100', 'Agfa', 'Ultra 100', 100, 'C-41', '35', ['#E2231A', K, '#FFFFFF', '#FFFFFF'], true],
  ['agfa-rsx-ii-100', 'Agfa', 'RSX II 100', 100, 'E-6', 'both', ['#1F4E9C', '#F2A71B', '#FFFFFF', K], true],

  // ── 그 밖의 브랜드
  ['foma-fomapan-200', 'Foma', 'Fomapan 200 Creative', 200, 'B&W', 'sheets', [W, '#1F4E9C', K, '#FFFFFF']],
  ['foma-retropan-320', 'Foma', 'Retropan 320 Soft', 320, 'B&W', 'both', ['#8B5A2B', '#F5F5F2', '#FFFFFF', '#8B5A2B']],
  ['ferrania-p30', 'Ferrania', 'P30 80', 80, 'B&W', '35', [K, '#E2231A', '#F5F5F2', '#FFFFFF', CAP]],
  ['ferrania-p33', 'Ferrania', 'P33 160', 160, 'B&W', '35', [K, '#1F7A8C', '#F5F5F2', '#FFFFFF', CAP]],
  ['ferrania-orto-50', 'Ferrania', 'Orto 50', 50, 'B&W', '35', [K, '#F4C430', '#F5F5F2', K, CAP]],
  ['kosmo-foto-mono-100', 'Kosmo Foto', 'Mono 100', 100, 'B&W', 'both', ['#C8102E', W, '#FFFFFF', '#C8102E']],
  ['kosmo-agent-shadow-400', 'Kosmo Foto', 'Agent Shadow 400', 400, 'B&W', '35', [K, '#C9A227', '#F5F5F2', K, CAP]],
  ['jch-streetpan-400', 'JCH', 'StreetPan 400', 400, 'B&W', 'both', ['#F4C430', K, K, '#F4C430']],
  ['shanghai-gp3-100', 'Shanghai', 'GP3 100', 100, 'B&W', '120', ['#1F4E9C', W, '#FFFFFF', '#1F4E9C']],
  ['konica-centuria-200', 'Konica', 'Centuria 200', 200, 'C-41', '35', ['#1F4E9C', '#F2A71B', '#FFFFFF', K], true],
  ['konica-centuria-400', 'Konica', 'Centuria 400', 400, 'C-41', '35', ['#1F4E9C', '#E2231A', '#FFFFFF', '#FFFFFF'], true],
]

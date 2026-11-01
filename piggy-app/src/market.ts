import type { City } from './types';

/**
 * Market figures for the house calculator. The app never goes online (privacy),
 * so these are a dated snapshot; every number can be changed in the calculator's assumptions.
 */
export interface Area {
  name: string;
  /** Average €/m², or the low and high ends of a range. */
  perM2: number;
  perM2High?: number;
  note?: string;
}

export interface CityMarket {
  name: string;
  country: string;
  asOf: string;
  areasTitle: string;
  areas: Area[];
  /** Typical yearly price growth, latest annual change. */
  growth: number;
  /** Typical mortgage rate for new loans. */
  rate: number;
  /** Usual maximum share of the price a bank lends for a main home. */
  standardLtv: number;
  /** Young-buyer guarantee: max share financed and price cap. */
  programme: { name: string; ltv: number; priceCap: number; summary: string };
  sources: Array<{ label: string; url: string }>;
}

export const MARKETS: Record<City, CityMarket> = {
  braga: {
    name: 'Braga',
    country: 'Portugal',
    asOf: 'October 2026',
    areasTitle: 'How much home is that in Braga?',
    areas: [
      { name: 'Braga, city average', perM2: 2396, note: 'idealista, Sept 2026' },
      { name: 'Centre: Sé, São Victor, Maximinos, Nogueira', perM2: 1800, perM2High: 2800, note: 'Range from April 2026; likely higher now' },
      { name: 'Residential: Gualtar, Real, Dume, Lamaçães', perM2: 1200, perM2High: 1800, note: 'Range from April 2026; likely higher now' },
    ],
    growth: 0.126,
    rate: 0.0293,
    standardLtv: 0.9,
    programme: {
      name: 'Garantia Pública',
      ltv: 1,
      priceCap: 45000000,
      summary: 'The State guarantee lets buyers aged 18–35 finance up to 100% of a first main home in Portugal, up to €450,000. You need a Portuguese tax address, income up to the 8th IRS bracket, and no other home. Contracts must be signed by 31 December 2026.',
    },
    sources: [
      { label: 'Braga TV: idealista price index for Braga, Sept 2026', url: 'https://bragatv.pt/preco-das-casas-em-braga-sobe-139-num-ano/' },
      { label: 'Doutor Imóveis: Braga prices by area, April 2026', url: 'https://www.doutorimoveis.pt/articles/comprar/guia-comprar-casa-braga-precos-bairros-2026' },
      { label: 'IMT tables 2026 (mainland Portugal)', url: 'https://imtcalc.pt/en/imt-table' },
      { label: 'Doutor Finanças: IMT 2026 and IMT Jovem', url: 'https://www.doutorfinancas.pt/impostos/saiba-quanto-vai-pagar-de-imt-em-2026/' },
      { label: 'ComparaJá: mortgage market, Aug 2026 (rates, LTV)', url: 'https://a.storyblok.com/f/223704/1236150/991fc89b8e/cj_analise-mensal-hl_setembro26.pdf' },
      { label: 'Governo de Portugal: Garantia Pública', url: 'https://portugal.gov.pt/pt/gc24/comunicacao/noticias/garantia-publica-o-que-e-e-como-funciona' },
    ],
  },
  madrid: {
    name: 'Madrid',
    country: 'Spain',
    asOf: 'October 2026',
    areasTitle: 'How much home is that in Madrid?',
    areas: [
      ['Villaverde', 3365], ['Puente de Vallecas', 3535], ['Usera', 3628], ['Carabanchel', 3829],
      ['Villa de Vallecas', 3852], ['Vicálvaro', 4036], ['Latina', 4045], ['San Blas', 4146],
      ['Moratalaz', 4522], ['Barajas', 4971], ['Ciudad Lineal', 5242], ['Hortaleza', 5440],
      ['Fuencarral', 5593], ['Tetuán', 6161], ['Moncloa', 6317], ['Arganzuela', 6384],
      ['Centro', 7771], ['Chamartín', 8127], ['Retiro', 8515], ['Chamberí', 9159], ['Salamanca', 10865],
    ].map(([name, perM2]) => ({ name: name as string, perM2: perM2 as number })),
    growth: 0.024,
    rate: 0.0395,
    standardLtv: 0.8,
    programme: {
      name: 'Mi Primera Vivienda',
      ltv: 1,
      priceCap: 42500000,
      summary: "The Comunidad de Madrid's guarantee lets banks lend more than 80%, up to 100%, for a first main home. It requires two years living in the region and has an age limit, and the price cap is €425,000 under the 2026 rules.",
    },
    sources: [
      { label: 'idealista: Madrid sale prices by district, Sept 2026', url: 'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/madrid-comunidad/madrid-provincia/madrid/' },
      { label: 'hipotecas.me: Madrid ITP and purchase costs', url: 'https://www.hipotecas.me/itp/madrid' },
      { label: 'hipotecas.me: mortgage rates, Sept 2026', url: 'https://www.hipotecas.me/informe-mensual/septiembre-2026' },
      { label: 'Comunidad de Madrid: Mi Primera Vivienda', url: 'https://www.comunidad.madrid/servicios/vivienda/mi-primera-vivienda' },
    ],
  },
};

/** INE (Spain) CPI flash estimate, October 2026. */
export const INFLATION = { value: 0.049, label: 'INE (Spain), October 2026', url: 'https://www.ine.es/dyngs/Prensa/adIPC1026.htm' };

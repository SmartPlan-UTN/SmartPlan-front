/**
 * A custom-styled Google Map for the results screen (CU17) — the vendor
 * default look reads as "embedded widget," not as part of the product.
 * Desaturates roads/water, hides POI icons and transit (noise a results map
 * doesn't need), and tints everything into the EMBER palette so the map
 * reads as the same surface as the rest of the page, not a bolted-on
 * iframe. Every color here is a hex a token in `tokens.css` already
 * resolves to — kept as literals because `google.maps.MapTypeStyle` can't
 * read CSS custom properties.
 */
export const BRANDED_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#F5F0E8' }] }, // --cream
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9E9589' }] }, // --fg-3
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F5F0E8' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#E4DCCF' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFCF7' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E4DCCF' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#EFDFC6' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#D9E3EE' }],
  },
];

/**
 * The results map at night: the same restraint, drawn from the dark theme's
 * tokens — land is the page (`--surface`), roads are raised surfaces,
 * borders are hairlines, labels are `--fg-3`, water a dusty night blue.
 */
export const BRANDED_MAP_STYLE_DARK: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#16110C' }] }, // --surface (dark)
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8C8275' }] }, // --fg-3 (dark)
  { elementType: 'labels.text.stroke', stylers: [{ color: '#16110C' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#362D24' }], // --hairline (dark)
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2A221A' }], // --surface-raised (dark)
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#362D24' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3A2E21' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17212B' }],
  },
];

/** One accent color per plan, cycling if there are ever more plans than colors. */
export const PLAN_PIN_COLORS = ['#E85D20', '#2B5BFF', '#22C06B'] as const; // --ember, --electric, --success

/**
 * The plan composer's discovery map (Step 2). Quieter than the results map:
 * the land is a shade under the page's cream so the map reads as a surface
 * on it, roads are paper-white hairlines, parks a barely-there warm sage and
 * water a dusty blue. Only places a person navigates by keep a label (towns,
 * neighbourhoods, main roads); every icon, POI and transit line is off — the
 * only things that stand out are SmartPlan's own markers and the terracotta
 * route. Hex literals for the same reason as above.
 */
export const COMPOSER_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#EEE7DB' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9E9589' }] }, // --fg-3
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F5F0E8' }, { weight: 3 }] }, // --cream
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }, { color: '#E2E2CC' }],
  },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5C5448' }], // --fg-2
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#B3AA9D' }],
  },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#FBF8F2' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#FFFCF7' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#EBDCC6' }] },
  { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#D3DCDD' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#8C9A9C' }] },
  { featureType: 'landscape.natural.terrain', elementType: 'geometry', stylers: [{ color: '#E9E1D3' }] },
];

/**
 * The composer's maps at night. Same hierarchy as `COMPOSER_MAP_STYLE` —
 * land a shade off the page (`--map-paper`), roads a step up, parks a
 * barely-there sage, water a dusty blue, labels only where people navigate
 * by — so the cream route nodes and the terracotta line still own it.
 */
export const COMPOSER_MAP_STYLE_DARK: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#241D16' }] }, // --map-paper (dark)
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8C8275' }] }, // --fg-3 (dark)
  { elementType: 'labels.text.stroke', stylers: [{ color: '#16110C' }, { weight: 3 }] }, // --surface (dark)
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }, { color: '#20271C' }],
  },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#B5AB9E' }], // --fg-2 (dark)
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6E655A' }],
  },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2E261D' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#342B21' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#3D3023' }] },
  { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#18232A' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5E6E72' }] },
  { featureType: 'landscape.natural.terrain', elementType: 'geometry', stylers: [{ color: '#211A14' }] },
];

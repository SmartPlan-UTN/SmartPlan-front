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

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

// Shared sizing for the floating glass header ((tabs)/_layout.tsx's
// FloatingHeader) - same role as tab-bar.ts's TAB_BAR_CLEARANCE, since the
// header floats over content (position: 'absolute') rather than reserving
// its own row, so scrollable tab screens need to reserve space at the top
// too or their first item renders underneath it.
export const HEADER_HEIGHT = 48;
export const HEADER_MARGIN = 16;
export const HEADER_CLEARANCE = HEADER_HEIGHT + HEADER_MARGIN * 2 + 8;

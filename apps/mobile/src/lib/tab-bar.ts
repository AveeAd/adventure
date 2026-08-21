// Shared sizing for the floating glass tab bar ((tabs)/_layout.tsx) so
// every scrollable tab screen can reserve the same amount of bottom
// clearance - the bar floats over content now (position: 'absolute')
// rather than reserving its own row the way a normal tab bar does, so a
// screen's last item would otherwise render underneath it.
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_MARGIN = 16;
// Height + top/bottom margin + a little breathing room above the pill.
export const TAB_BAR_CLEARANCE = TAB_BAR_HEIGHT + TAB_BAR_MARGIN * 2 + 16;

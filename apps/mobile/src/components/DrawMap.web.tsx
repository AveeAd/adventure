import { Text, View } from 'react-native';

// Same reasoning as AdventureMap.web.tsx - @maplibre/maplibre-react-native
// has no web target, so this stub keeps `expo export --platform web`
// working for every route that renders DrawMap (page/trail/spot creation).
export function DrawMap(_props: {
  points: [number, number][];
  onPointsChange: (points: [number, number][]) => void;
  mode: 'point' | 'line';
  center?: [number, number];
}) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-center text-stone-500 dark:text-stone-400">
        Map drawing is only available in the mobile app.
      </Text>
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, Text, View, type ListRenderItemInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface LightboxPhoto {
  url: string;
  altText: string | null;
}

// Full-screen swipeable photo viewer - a solid black scrim on purpose
// (CLAUDE.md "Design system": "Deliberately left solid: the photo
// lightbox (a scrim should isolate the image, not let brand color bleed
// through)"), same reasoning apps/public's own Lightbox already follows.
// A horizontal paging FlatList rather than a library - swipe-between-
// photos is the only interaction needed here, no zoom/pan yet.
export function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const width = Dimensions.get('window').width;

  const renderItem = ({ item }: ListRenderItemInfo<LightboxPhoto>) => (
    <View style={{ width, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={{ uri: item.url }}
        style={{ width, height: '100%' }}
        contentFit="contain"
        accessibilityLabel={item.altText ?? undefined}
      />
    </View>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(item, i) => `${item.url}-${i}`}
          renderItem={renderItem}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        />
        <Pressable
          onPress={onClose}
          className="absolute right-4 rounded-full bg-black/40 p-2 active:opacity-70"
          style={{ top: insets.top + 12 }}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </Pressable>
        {photos.length > 1 ? (
          <Text
            className="absolute self-center text-sm font-medium text-white"
            style={{ bottom: insets.bottom + 16 }}
          >
            {index + 1} / {photos.length}
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}

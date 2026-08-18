import type { UploadImageResponse } from '@adventure/api-types';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { authUpload } from '@/lib/auth-fetch';

// POST /uploads/images only whitelists image/jpeg|png|webp|gif (see
// apps/api/src/uploads/uploads.controller.ts) - no HEIC, so an iOS camera
// capture (which defaults to HEIC) must be re-encoded client-side before
// upload rather than relying on the server to accept it.
async function reencodeToJpeg(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

async function uploadUri(uri: string): Promise<UploadImageResponse> {
  const jpegUri = await reencodeToJpeg(uri);
  const formData = new FormData();
  formData.append('file', {
    uri: jpegUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  return authUpload<UploadImageResponse>('/uploads/images', formData);
}

// Launches the source picker (camera vs. library), then re-encodes +
// uploads the chosen image. Returns null if the user cancels at any step -
// callers should treat that as a no-op, not an error.
export async function pickAndUploadImage(
  source: 'camera' | 'library',
): Promise<UploadImageResponse | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      source === 'camera'
        ? 'Camera permission is required to take a photo.'
        : 'Photo library permission is required to choose a photo.',
    );
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return uploadUri(result.assets[0].uri);
}

import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { useAudio } from '../context/AudioContext';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSegments } from 'expo-router';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlay, nextTrack, setPlayerOpen } = useAudio();
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  if (!currentTrack) return null;

  const trackTitle = currentTrack.title || "Unknown Song";
  const trackArtist = currentTrack.artist || "Unknown Artist";
  const trackImage = currentTrack.thumbnail || currentTrack.thumbnail_url || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=120&h=120&fit=crop&q=80";

  // Determine if the tab bar is visible (active screen is in the (tabs) folder)
  const inTabGroup = segments[0] === '(tabs)';

  // Calculate dynamic bottom tab bar height
  const tabBottomPadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 30 : 10);
  const tabHeight = 50 + tabBottomPadding;

  // Position MiniPlayer above tab bar if inTabGroup, otherwise above device's bottom safe area
  const bottomOffset = inTabGroup ? tabHeight + 8 : (insets.bottom > 0 ? insets.bottom + 8 : 16);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setPlayerOpen(true)}
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: 8,
        right: 8,
        backgroundColor: 'rgba(24, 24, 27, 0.96)',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 16,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 50,
      }}
    >
      <View className="flex-row items-center flex-1 mr-4">
        <Image
          source={{ uri: trackImage }}
          className="w-10 h-10 rounded-lg bg-zinc-800"
        />
        <View className="ml-3 flex-1">
          <Text className="text-white text-xs font-bold font-sans" numberOfLines={1}>
            {trackTitle}
          </Text>
          <Text className="text-zinc-400 text-[10px] font-sans mt-0.5" numberOfLines={1}>
            {trackArtist}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="w-8 h-8 rounded-full bg-white items-center justify-center"
        >
          {isPlaying ? (
            <Pause size={14} color="#000" fill="#000" />
          ) : (
            <View className="ml-0.5">
              <Play size={14} color="#000" fill="#000" />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            nextTrack();
          }}
          className="p-1"
        >
          <SkipForward size={16} color="#fff" fill="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

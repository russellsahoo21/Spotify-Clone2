import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, Image, ScrollView, Dimensions, Platform } from 'react-native';
import { useAudio } from '../context/AudioContext';
import { ChevronDown, Play, Pause, SkipForward, SkipBack, Heart, Shuffle, Repeat, Music, Tv } from 'lucide-react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { API_BASE } from '../constants/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PlayerModal() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    progress,
    duration,
    seekTo,
    isLooping,
    toggleLoop,
    isShuffling,
    toggleShuffle,
    favorites,
    toggleFavorite,
    playerOpen,
    setPlayerOpen,
    isVideoMode,
    setIsVideoMode,
    playerRef
  } = useAudio();

  const [playerReady, setPlayerReady] = useState(false);

  const onPlayerReady = useCallback(() => {
    console.log('YoutubePlayer: READY');
    setPlayerReady(true);
  }, []);

  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [showLyricsCard, setShowLyricsCard] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!currentTrack) return;
    const trackId = currentTrack.id || currentTrack.video_id;

    async function getLyrics() {
      setLyricsLoading(true);
      setLyrics(null);
      try {
        const res = await fetch(`${API_BASE}/music/lyrics/${trackId}`);
        if (res.ok) {
          const data = await res.json();
          setLyrics(data.lyrics || "No lyrics found for this song.");
        } else {
          setLyrics("Lyrics unavailable.");
        }
      } catch (err) {
        console.error("Lyrics error:", err);
        setLyrics("Failed to load lyrics.");
      } finally {
        setLyricsLoading(false);
      }
    }
    getLyrics();
  }, [currentTrack]);

  if (!currentTrack) return null;

  const trackTitle = currentTrack.title || "Unknown Song";
  const trackArtist = currentTrack.artist || "Unknown Artist";
  const trackImage = currentTrack.thumbnail || currentTrack.thumbnail_url || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=120&h=120&fit=crop&q=80";
  const isLiked = favorites.has(currentTrack.id || currentTrack.video_id);

  // Time format helper
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Touch progress seek handler
  const handleProgressTouch = (evt: any) => {
    const { locationX } = evt.nativeEvent;
    const barWidth = screenWidth - 48;
    const pct = Math.max(0, Math.min(1, locationX / barWidth));
    seekTo(pct * (duration || 1));
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  const handleScrollToLyrics = () => {
    setShowLyricsCard(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: playerOpen ? 0 : -screenWidth * 2,
        width: screenWidth,
        height: screenHeight,
        backgroundColor: '#000',
        zIndex: 1000,
      }}
    >

        <View className="flex-row items-center justify-between px-6 pt-14 pb-2 z-50">
          <TouchableOpacity onPress={() => setPlayerOpen(false)} className="p-1">
            <ChevronDown size={28} color="#fff" />
          </TouchableOpacity>

          <View className="flex-row bg-zinc-900 border border-zinc-800 rounded-full p-0.5">
            <TouchableOpacity
              onPress={() => setIsVideoMode(false)}
              className={`flex-row items-center gap-1.5 px-4 py-1.5 rounded-full ${!isVideoMode ? 'bg-zinc-800' : ''}`}
            >
              <Music size={12} color={!isVideoMode ? '#fff' : '#a1a1aa'} />
              <Text className={`text-[10px] font-bold ${!isVideoMode ? 'text-white' : 'text-zinc-400'}`}>Song</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsVideoMode(true)}
              className={`flex-row items-center gap-1.5 px-4 py-1.5 rounded-full ${isVideoMode ? 'bg-zinc-800' : ''}`}
            >
              <Tv size={12} color={isVideoMode ? '#fff' : '#a1a1aa'} />
              <Text className={`text-[10px] font-bold ${isVideoMode ? 'text-white' : 'text-zinc-400'}`}>Video</Text>
            </TouchableOpacity>
          </View>

          <View className="w-7 h-7" />
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="items-center justify-center my-6 relative" style={{ width: screenWidth, height: isVideoMode ? (screenWidth - 48) * 9 / 16 : screenWidth - 48 }}>
            {/* YouTube Player Container - always mounted to prevent playback from stopping */}
            <View
              style={
                isVideoMode
                  ? {
                      width: screenWidth - 48,
                      height: (screenWidth - 48) * 9 / 16,
                      borderRadius: 16,
                      overflow: 'hidden',
                      backgroundColor: '#000',
                    }
                  : {
                      position: 'absolute',
                      left: -screenWidth * 2, // Position far offscreen when in audio-only mode
                      width: screenWidth - 48,
                      height: (screenWidth - 48) * 9 / 16,
                    }
              }
            >
              <YoutubePlayer
                ref={playerRef}
                height={(screenWidth - 48) * 9 / 16}
                width={screenWidth - 48}
                play={playerReady && isPlaying}
                videoId={currentTrack.id || currentTrack.video_id}
                forceAndroidAutoplay={true}
                initialPlayerParams={{
                  preventFullScreen: true,
                  cc_lang_pref: 'en',
                  modestbranding: true,
                }}
                webViewProps={{
                  mediaPlaybackRequiresUserAction: false,
                  allowsInlineMediaPlayback: true,
                  androidLayerType: 'hardware',
                  allowsBackgroundMediaPlayback: true,
                }}
                onReady={onPlayerReady}
                onError={(e: any) => console.log('YoutubePlayer Error:', e)}
                onChangeState={(state: any) => {
                  console.log('YoutubePlayer State:', state);
                  if (state === 'ended') {
                    if (isLooping) {
                      playerRef.current?.seekTo(0, true);
                    } else {
                      nextTrack();
                    }
                  }
                }}
              />
            </View>

            {/* Cover image shown when in audio mode */}
            {!isVideoMode && (
              <Image
                source={{ uri: trackImage }}
                className="rounded-2xl bg-zinc-900 shadow-2xl"
                style={{ width: screenWidth - 48, height: screenWidth - 48 }}
              />
            )}
          </View>

          <View className="px-6 flex-row items-center justify-between mb-8">
            <View className="flex-1 mr-4">
              <Text className="text-white text-xl font-extrabold font-sans" numberOfLines={1}>
                {trackTitle}
              </Text>
              <Text className="text-zinc-400 text-sm font-sans mt-1" numberOfLines={1}>
                {trackArtist}
              </Text>
            </View>
            <TouchableOpacity onPress={() => toggleFavorite(currentTrack)} className="p-2">
              <Heart size={24} color={isLiked ? '#d91b29' : '#fff'} fill={isLiked ? '#d91b29' : 'transparent'} />
            </TouchableOpacity>
          </View>

          <View className="px-6 mb-6">
            <View
              onStartShouldSetResponder={() => true}
              onResponderRelease={handleProgressTouch}
              className="w-full h-1 bg-zinc-800 rounded-full justify-center"
            >
              <View
                className="h-full bg-white rounded-full relative"
                style={{ width: `${progressPercent}%` }}
              >
                <View className="absolute right-[-4px] top-[-3px] w-2.5 h-2.5 bg-white rounded-full shadow" />
              </View>
            </View>

            <View className="flex-row justify-between mt-2.5">
              <Text className="text-[10px] text-zinc-500 font-sans">{formatTime(progress)}</Text>
              <Text className="text-[10px] text-zinc-500 font-sans">{formatTime(duration)}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between px-8 mb-10">
            <TouchableOpacity onPress={toggleShuffle} className="p-2">
              <Shuffle size={20} color={isShuffling ? '#d91b29' : '#a1a1aa'} />
            </TouchableOpacity>

            <TouchableOpacity onPress={prevTrack} className="p-2">
              <SkipBack size={26} color="#fff" fill="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={togglePlay}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 4
              }}
            >
              {isPlaying ? (
                <Pause size={24} color="#000" fill="#000" />
              ) : (
                <View className="ml-1">
                  <Play size={24} color="#000" fill="#000" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={nextTrack} className="p-2">
              <SkipForward size={26} color="#fff" fill="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleLoop} className="p-2">
              <Repeat size={20} color={isLooping ? '#d91b29' : '#a1a1aa'} />
            </TouchableOpacity>
          </View>

          {!showLyricsCard && (
            <TouchableOpacity
              onPress={handleScrollToLyrics}
              style={{
                marginLeft: 24,
                marginRight: 24,
                padding: 16,
                backgroundColor: 'rgba(24, 24, 27, 0.6)',
                borderWidth: 1,
                borderColor: 'rgba(39, 39, 42, 0.8)',
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8
              }}
            >
              <Text className="text-zinc-300 text-xs font-bold font-sans">Lyrics card</Text>
              <Text className="text-zinc-500 text-[10px] font-sans ml-2">Click to expand</Text>
            </TouchableOpacity>
          )}

          {showLyricsCard && (
            <View className="mx-6 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl min-h-[220px]">
              <View className="flex-row items-center justify-between mb-4 border-b border-zinc-800 pb-3">
                <Text className="text-white text-xs font-extrabold uppercase tracking-widest font-sans">Lyrics</Text>
                <TouchableOpacity onPress={() => setShowLyricsCard(false)}>
                  <Text className="text-zinc-500 text-[10px] font-sans font-bold">Hide</Text>
                </TouchableOpacity>
              </View>

              {lyricsLoading ? (
                <Text className="text-zinc-400 text-xs italic font-sans text-center my-6">Loading lyrics...</Text>
              ) : (
                <ScrollView nestedScrollEnabled={true} className="max-h-[240px]">
                  <Text className="text-zinc-200 text-xs leading-6 font-semibold font-sans">
                    {lyrics}
                  </Text>
                </ScrollView>
              )}
            </View>
          )}

        </ScrollView>
    </View>
  );
}

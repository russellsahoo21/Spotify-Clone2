import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { Sparkles, Music, Library } from 'lucide-react-native';
import { API_BASE } from '../../constants/api';

const MOODS = ['Chill', 'Happy', 'Energetic', 'Focus', 'Sad'];

export default function HomeScreen() {
  const { token, logout, user, openPersonalize } = useAuth();
  const { playTrack, dismissedIds, recommendationsRevision } = useAudio();

  // Feed states
  const [selectedMood, setSelectedMood] = useState('Chill');
  const [moodSongs, setMoodSongs] = useState<any[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);

  const [feedSections, setFeedSections] = useState<any[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedLoading, setFeedLoading] = useState(false);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const feedId = useRef<string | null>(null);
  const feedGeneration = useRef(0);
  const loadingMore = useRef(false);

  // Dynamic charts states (Trending)
  const [trending, setTrending] = useState<any[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);

  // Fetch charts on mount
  useEffect(() => {
    if (!token) return;
    async function fetchCharts() {
      setChartsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/explore/`);
        if (res.ok) {
          const data = await res.json();
          const chartTracks = data.trending || data.songs || [];
          setTrending(chartTracks);
        }
      } catch (err) {
        console.error("Failed to load charts:", err);
      } finally {
        setChartsLoading(false);
      }
    }
    fetchCharts();
  }, [token]);

  // Helper to fetch feed page
  const fetchFeedPage = useCallback(async (pageNum: number, id?: string | null, signal?: AbortSignal) => {
    const params = id ? `&feed_id=${encodeURIComponent(id)}` : '&refresh=true';
    const res = await fetch(`${API_BASE}/explore/infinite-feed?page=${pageNum}${params}`, {
      headers: { Authorization: `Bearer ${token}` }, signal,
    });
    if (!res.ok) throw new Error(res.status === 410 ? 'Your feed has expired.' : 'Recommendations unavailable.');
    return res.json();
  }, [token]);

  // Load initial feed
  useEffect(() => {
    const controller = new AbortController();
    const generation = ++feedGeneration.current;
    loadingMore.current = false;
    feedId.current = null;
    setFeedSections([]);
    setFeedPage(1);
    setHasMoreFeed(true);
    setFeedError(null);
    if (!token) {
      setFeedLoading(false);
      setRefreshing(false);
      return;
    }
    async function loadInitialFeed() {
      setFeedLoading(true);
      setRefreshing(true);
      try {
        const first = await fetchFeedPage(1, null, controller.signal);
        if (controller.signal.aborted || generation !== feedGeneration.current) return;
        feedId.current = first.feed_id;
        setFeedSections([first]);
        setFeedPage(2);
        setHasMoreFeed(first.has_more);
        if (first.has_more) {
          const second = await fetchFeedPage(2, first.feed_id, controller.signal);
          if (controller.signal.aborted || generation !== feedGeneration.current) return;
          setFeedSections([first, second]);
          setFeedPage(3);
          setHasMoreFeed(second.has_more);
        }
      } catch (err: any) {
        if (!controller.signal.aborted) setFeedError(err.message || 'Recommendations unavailable.');
      } finally {
        if (!controller.signal.aborted && generation === feedGeneration.current) {
          setFeedLoading(false);
          setRefreshing(false);
        }
      }
    }
    loadInitialFeed();
    return () => controller.abort();
  }, [token, fetchFeedPage, refreshIndex, recommendationsRevision, user?.artists, user?.genres]);

  // Fetch mood-based songs
  useEffect(() => {
    async function fetchMoodSongs() {
      setMoodLoading(true);
      try {
        const res = await fetch(`${API_BASE}/explore/mood?mood=${encodeURIComponent(selectedMood)}`);
        if (res.ok) {
          const data = await res.json();
          console.log("Mood songs first item:", JSON.stringify(data?.[0]));
          setMoodSongs(data || []);
        }
      } catch (err) {
        console.error("Error fetching mood songs:", err);
      } finally {
        setMoodLoading(false);
      }
    }
    fetchMoodSongs();
  }, [selectedMood]);

  // Scroll load-more handler
  const loadMoreContent = async () => {
    if (feedLoading || loadingMore.current || !hasMoreFeed || !token || !feedId.current || feedError) return;
    const generation = feedGeneration.current;
    loadingMore.current = true;
    setFeedLoading(true);
    try {
      const nextSection = await fetchFeedPage(feedPage, feedId.current);
      if (generation !== feedGeneration.current) return;
      setFeedSections(prev => {
        const ids = new Set(prev.flatMap(section => section.tracks.map((track: any) => track.id)));
        return [...prev, { ...nextSection, tracks: nextSection.tracks.filter((track: any) => !ids.has(track.id)) }];
      });
      setFeedPage(value => value + 1);
      setHasMoreFeed(nextSection.has_more);
    } catch (err: any) {
      if (generation === feedGeneration.current) setFeedError(err.message || 'Recommendations unavailable.');
    } finally {
      if (generation === feedGeneration.current) {
        loadingMore.current = false;
        setFeedLoading(false);
      }
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
    if (isCloseToBottom) {
      loadMoreContent();
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-black"
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={400}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshIndex(value => value + 1)} tintColor="#d91b29" />}
      contentContainerStyle={{ paddingBottom: 180, paddingTop: 60 }}
    >

      {/* Header bar */}
      <View className="flex-row items-center justify-between px-6 mb-6">
        <View>
          <Text className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest font-sans">StreamYT Feed</Text>
          <Text className="text-white text-2xl font-extrabold font-sans mt-0.5">Welcome, {user?.username || "Guest"}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity 
            onPress={openPersonalize} 
            style={{ 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              backgroundColor: 'rgba(127, 29, 29, 0.2)', 
              borderWidth: 1, 
              borderColor: '#ef4444', 
              borderRadius: 9999, 
              flexDirection: 'row', 
              alignItems: 'center' 
            }}
          >
            <View className="mr-1.5">
              <Sparkles size={11} color="#f87171" />
            </View>
            <Text className="text-red-400 text-[9px] font-bold font-sans">Personalize</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full">
            <Text className="text-zinc-400 text-[9px] font-bold font-sans">Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mood filter chips */}
      <View className="mb-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}>
          {MOODS.map(m => {
            const active = selectedMood === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setSelectedMood(m)}
                className={`px-5 py-2 rounded-full border ${active
                    ? 'bg-red-650 border-red-650'
                    : 'bg-zinc-900 border-zinc-800'
                  }`}
              >
                <Text className={`text-[10px] font-bold font-sans ${active ? 'text-white' : 'text-zinc-400'}`}>{m}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Mood Mix songs playlist row */}
      <View className="mb-8">
        <View className="flex-row items-center gap-2 px-6 mb-4">
          <Sparkles size={16} color="#d91b29" />
          <Text className="text-white text-sm font-bold font-sans">{selectedMood} mood mix</Text>
        </View>
        {moodLoading ? (
          <ActivityIndicator size="small" color="#d91b29" className="my-6" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}>
            {moodSongs.slice(0, 10).map((t, idx) => (
              <TouchableOpacity
                key={t.id || t.video_id || idx}
                onPress={() => playTrack(t, moodSongs)}
                className="w-28"
              >
                <Image
                  source={{ uri: t.thumbnail || t.thumbnail_url }}
                  className="w-28 h-28 rounded-2xl bg-zinc-900 border border-zinc-850"
                />
                <Text className="text-white text-[10px] font-bold mt-2 font-sans truncate" numberOfLines={1}>{t.title}</Text>
                <Text className="text-zinc-500 text-[8px] font-sans mt-0.5 truncate" numberOfLines={1}>{t.artist}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Trending Charts row */}
      {trending.length > 0 && (
        <View className="mb-8">
          <View className="flex-row items-center gap-2 px-6 mb-4">
            <Music size={16} color="#d91b29" />
            <Text className="text-white text-sm font-bold font-sans">Trending hits today</Text>
          </View>
          {chartsLoading ? (
            <ActivityIndicator size="small" color="#d91b29" className="my-6" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}>
              {trending.map((t, idx) => (
                <TouchableOpacity
                  key={t.id || t.video_id || idx}
                  onPress={() => playTrack(t, trending)}
                  className="w-28"
                >
                  <Image
                    source={{ uri: t.thumbnail || t.thumbnail_url }}
                    className="w-28 h-28 rounded-2xl bg-zinc-900 border border-zinc-850"
                  />
                  <Text className="text-white text-[10px] font-bold mt-2 font-sans truncate" numberOfLines={1}>{t.title}</Text>
                  <Text className="text-zinc-500 text-[8px] font-sans mt-0.5 truncate" numberOfLines={1}>{t.artist}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Personalized dynamic infinite Scroll blocks */}
      {feedSections.map((rawSection, sIdx) => {
        const section = { ...rawSection, tracks: rawSection.tracks?.filter((track: any) => !dismissedIds.has(track.id)) };
        if (!section || !section.tracks || section.tracks.length === 0) return null;

        return (
          <View key={sIdx} className="mb-8">
            <View className="flex-row items-center gap-2 px-6 mb-4">
              <Library size={16} color="#d91b29" />
              <Text className="text-white text-sm font-bold font-sans">{section.title}</Text>
            </View>

            {section.layout === 'quick-picks' ? (
              // Quick Picks Grid
              <View className="px-6 flex-row flex-wrap justify-between">
                {section.tracks.map((t: any, idx: number) => (
                  <TouchableOpacity
                    key={t.id || idx}
                    onPress={() => playTrack(t, section.tracks)}
                    className="w-[48%] flex-row items-center bg-zinc-900 border border-zinc-850 rounded-2xl p-2 mb-3"
                  >
                    <Image source={{ uri: t.thumbnail }} className="w-10 h-10 rounded-lg bg-zinc-950" />
                    <View className="ml-2.5 flex-1">
                      <Text className="text-white text-[9px] font-bold font-sans truncate" numberOfLines={1}>{t.title}</Text>
                      <Text className="text-zinc-500 text-[7px] font-sans mt-0.5 truncate" numberOfLines={1}>{t.artist}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // Standard Carousel List
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}>
                {section.tracks.map((t: any, idx: number) => (
                  <TouchableOpacity
                    key={t.id || idx}
                    onPress={() => playTrack(t, section.tracks)}
                    className="w-28"
                  >
                    <Image
                      source={{ uri: t.thumbnail || t.thumbnail_url }}
                      className="w-28 h-28 rounded-2xl bg-zinc-900 border border-zinc-850"
                    />
                    <Text className="text-white text-[10px] font-bold mt-2 font-sans truncate" numberOfLines={1}>{t.title}</Text>
                    <Text className="text-zinc-500 text-[8px] font-sans mt-0.5 truncate" numberOfLines={1}>{t.artist}</Text>
                    {t.reason && <Text className="text-zinc-400 text-[10px] font-sans mt-1" numberOfLines={2}>{t.reason}</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        );
      })}

      {feedError && (
        <View className="px-6 py-4 flex-row items-center justify-between">
          <Text accessibilityRole="alert" className="text-zinc-400 text-xs flex-1 mr-3">{feedError}</Text>
          <TouchableOpacity onPress={() => setRefreshIndex(value => value + 1)} accessibilityRole="button">
            <Text className="text-white text-xs font-bold">Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {feedLoading && (
        <ActivityIndicator size="small" color="#d91b29" className="mt-4 mb-8" />
      )}

    </ScrollView>
  );
}

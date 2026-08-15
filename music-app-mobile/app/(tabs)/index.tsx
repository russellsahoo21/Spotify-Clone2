import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { Sparkles, Music, Library } from 'lucide-react-native';
import { API_BASE } from '../../constants/api';

const { width: screenWidth } = Dimensions.get('window');

const MOODS = ['Chill', 'Happy', 'Energetic', 'Focus', 'Sad'];

export default function HomeScreen() {
  const { token, logout, user, openPersonalize } = useAuth();
  const { playTrack } = useAudio();

  // Feed states
  const [selectedMood, setSelectedMood] = useState('Chill');
  const [moodSongs, setMoodSongs] = useState<any[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);

  const [feedSections, setFeedSections] = useState<any[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedLoading, setFeedLoading] = useState(false);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);

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
  const fetchFeedPage = async (pageNum: number) => {
    try {
      const res = await fetch(`${API_BASE}/explore/infinite-feed?page=${pageNum}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error(`Error fetching feed page ${pageNum}:`, err);
    }
    return null;
  };

  // Load initial feed
  useEffect(() => {
    if (!token) return;
    async function loadInitialFeed() {
      setFeedLoading(true);
      try {
        const pages = await Promise.all([
          fetchFeedPage(1),
          fetchFeedPage(2),
          fetchFeedPage(3),
          fetchFeedPage(4),
          fetchFeedPage(5)
        ]);
        const valid = pages.filter(Boolean);
        setFeedSections(valid);
        setFeedPage(6);
      } catch (err) {
        console.error("Failed to load initial feed:", err);
      } finally {
        setFeedLoading(false);
      }
    }
    loadInitialFeed();
  }, [token]);

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
    if (feedLoading || !hasMoreFeed || !token) return;
    setFeedLoading(true);
    const nextSection = await fetchFeedPage(feedPage);
    if (nextSection && nextSection.tracks && nextSection.tracks.length > 0) {
      setFeedSections(prev => [...prev, nextSection]);
      setFeedPage(prev => prev + 1);
    } else {
      setHasMoreFeed(false);
    }
    setFeedLoading(false);
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
      {feedSections.map((section, sIdx) => {
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
                {section.tracks.slice(0, 6).map((t: any, idx: number) => (
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
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        );
      })}

      {feedLoading && (
        <ActivityIndicator size="small" color="#d91b29" className="mt-4 mb-8" />
      )}

    </ScrollView>
  );
}

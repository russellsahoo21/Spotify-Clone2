import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudio } from '../context/AudioContext';
import { ChevronLeft, Play, Sparkles } from 'lucide-react-native';
import { API_BASE } from '../constants/api';

export default function MixDetailsScreen() {
  const { name } = useLocalSearchParams();
  const { playTrack } = useAudio();
  const router = useRouter();

  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;

    async function fetchMixTracks() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/explore/mood?mood=${encodeURIComponent(String(name))}`);
        if (res.ok) {
          const data = await res.json();
          setTracks(data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchMixTracks();
  }, [name]);

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    playTrack(tracks[0], tracks);
  };

  return (
    <View className="flex-1 bg-black pt-14 px-6">

      {/* Header */}
      <View className="flex-row items-center gap-4 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-white font-sans truncate flex-1" numberOfLines={1}>
          {name ? `${name} Mix` : "Mix Details"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#d91b29" className="my-12" />
      ) : tracks.length === 0 ? (
        <Text className="text-zinc-500 text-xs italic font-sans text-center my-12">No tracks found in this mix.</Text>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* Banner */}
          <View className="items-center my-6">
            <View className="w-40 h-40 bg-zinc-900 border border-zinc-800 rounded-3xl items-center justify-center shadow-2xl">
              <Sparkles size={64} color="#d91b29" />
            </View>
            <Text className="text-white text-lg font-extrabold font-sans mt-4 text-center">{name} Mix</Text>
            <Text className="text-zinc-500 text-xs font-sans text-center mt-1">Personalized dynamic compilation</Text>

            <TouchableOpacity
              onPress={handlePlayAll}
              className="mt-6 flex-row items-center gap-2.5 bg-red-650 px-6 py-3 rounded-full shadow-lg"
            >
              <Play size={14} color="#fff" fill="#fff" />
              <Text className="text-white text-xs font-bold font-sans">Play Mix</Text>
            </TouchableOpacity>
          </View>

          {/* Songs List */}
          <View className="mt-4">
            <Text className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-sans mb-3">Tracks</Text>
            {tracks.map((song: any, idx: number) => {
              const coverArt = song.thumbnail || song.thumbnail_url || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=120&h=120&fit=crop&q=80";

              return (
                <TouchableOpacity
                  key={song.id || song.video_id || idx}
                  onPress={() => playTrack(song, tracks)}
                  className="flex-row items-center justify-between border-b border-zinc-900 py-3.5"
                >
                  <View className="flex-row items-center flex-1 mr-4">
                    <Image source={{ uri: coverArt }} className="w-11 h-11 rounded-lg bg-zinc-900" />
                    <View className="ml-3.5 flex-1">
                      <Text className="text-white text-xs font-bold font-sans truncate" numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text className="text-zinc-500 text-[9px] font-sans mt-0.5 truncate" numberOfLines={1}>
                        {song.artist}
                      </Text>
                    </View>
                  </View>

                  <Play size={14} color="#a1a1aa" />
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>
      )}

    </View>
  );
}

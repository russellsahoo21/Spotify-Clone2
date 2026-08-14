import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { ChevronLeft, Play, Trash, ListMusic } from 'lucide-react-native';
import { API_BASE } from '../constants/api';

export default function PlaylistDetailsScreen() {
  const { id, name } = useLocalSearchParams();
  const { token } = useAuth();
  const { playTrack } = useAudio();
  const router = useRouter();

  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlaylistDetails = async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/playlists/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylist(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylistDetails();
  }, [id, token]);

  const handlePlayAll = () => {
    if (!playlist || !playlist.songs || playlist.songs.length === 0) return;

    // Play the first track and load the rest into the queue
    const mappedSongs = playlist.songs.map((s: any) => ({
      id: s.video_id,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail_url,
      duration: s.duration
    }));

    playTrack(mappedSongs[0], mappedSongs);
  };

  const handleRemoveSong = async (videoId: string) => {
    try {
      const res = await fetch(`${API_BASE}/playlists/${id}/songs/${videoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPlaylistDetails(); // Reload tracks list
      } else {
        Alert.alert("Error", "Failed to remove song from playlist.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View className="flex-1 bg-black pt-14 px-6">

      {/* Header bar */}
      <View className="flex-row items-center gap-4 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-white font-sans truncate flex-1" numberOfLines={1}>
          {name || "Playlist Details"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#d91b29" className="my-12" />
      ) : !playlist ? (
        <Text className="text-zinc-500 text-xs italic font-sans text-center my-12">Playlist not found.</Text>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* Cover Art Banner */}
          <View className="items-center my-6">
            <View className="w-40 h-40 bg-zinc-900 border border-zinc-800 rounded-3xl items-center justify-center shadow-2xl">
              <ListMusic size={64} color="#d91b29" />
            </View>
            <Text className="text-white text-lg font-extrabold font-sans mt-4 text-center">{playlist.title || playlist.name}</Text>
            {playlist.description && (
              <Text className="text-zinc-500 text-xs font-sans text-center mt-1 px-8 leading-relaxed">
                {playlist.description}
              </Text>
            )}

            {playlist.songs && playlist.songs.length > 0 && (
              <TouchableOpacity
                onPress={handlePlayAll}
                className="mt-6 flex-row items-center gap-2.5 bg-red-650 px-6 py-3 rounded-full shadow-lg"
              >
                <Play size={14} color="#fff" fill="#fff" />
                <Text className="text-white text-xs font-bold font-sans">Play All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Songs List */}
          <View className="mt-4">
            <Text className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-sans mb-3">Tracks</Text>
            {(!playlist.songs || playlist.songs.length === 0) ? (
              <Text className="text-zinc-500 text-xs italic font-sans text-center my-12">This playlist is empty.</Text>
            ) : (
              playlist.songs.map((song: any, idx: number) => {
                const coverArt = song.thumbnail_url || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=120&h=120&fit=crop&q=80";

                return (
                  <View
                    key={song.id || idx}
                    className="flex-row items-center justify-between border-b border-zinc-900 py-3.5"
                  >
                    <TouchableOpacity
                      onPress={() => playTrack({
                        id: song.video_id,
                        title: song.title,
                        artist: song.artist,
                        thumbnail: song.thumbnail_url,
                        duration: song.duration
                      }, playlist.songs.map((s: any) => ({
                        id: s.video_id,
                        title: s.title,
                        artist: s.artist,
                        thumbnail: s.thumbnail_url,
                        duration: s.duration
                      })))}
                      className="flex-row items-center flex-1 mr-4"
                    >
                      <Image source={{ uri: coverArt }} className="w-11 h-11 rounded-lg bg-zinc-900" />
                      <View className="ml-3.5 flex-1">
                        <Text className="text-white text-xs font-bold font-sans truncate" numberOfLines={1}>
                          {song.title}
                        </Text>
                        <Text className="text-zinc-500 text-[9px] font-sans mt-0.5 truncate" numberOfLines={1}>
                          {song.artist}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRemoveSong(song.video_id)}
                      className="p-2"
                    >
                      <Trash size={16} color="#71717a" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

        </ScrollView>
      )}

    </View>
  );
}

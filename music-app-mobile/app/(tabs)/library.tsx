import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useAudio } from '../../context/AudioContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { Plus, Heart, History, ListMusic, Trash } from 'lucide-react-native';
import { API_BASE } from '../../constants/api';

export default function LibraryScreen() {
  const { token } = useAuth();
  const { favorites, history, playTrack, toggleFavorite, fetchFavorites, fetchHistory } = useAudio();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'playlists' | 'favorites' | 'history'>('playlists');

  // Playlists state
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);

  // Fetch playlists
  const fetchPlaylists = useCallback(async () => {
    if (!token) return;
    setPlaylistsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/playlists`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data || []);
      }
    } catch (err) {
      console.error("Failed to load playlists:", err);
    } finally {
      setPlaylistsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'playlists') {
      fetchPlaylists();
    } else if (activeTab === 'favorites') {
      fetchFavorites();
    } else if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, token, fetchPlaylists, fetchFavorites, fetchHistory]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Error", "Playlist name cannot be empty.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newPlaylistName })
      });

      if (res.ok) {
        setNewPlaylistName('');
        setShowCreateInput(false);
        fetchPlaylists();
      } else {
        Alert.alert("Error", "Failed to create playlist.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not connect to server.");
    }
  };

  const handleDeletePlaylist = async (playlistId: number) => {
    Alert.alert(
      "Delete Playlist",
      "Are you sure you want to delete this playlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/playlists/${playlistId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                fetchPlaylists();
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-black pt-14 px-6">

      {/* Title */}
      <Text className="text-2xl font-extrabold text-white mb-6 font-sans">Your Library</Text>

      {/* Segmented Tab Headers */}
      <View className="flex-row border-b border-zinc-900 pb-3 mb-5">
        <TouchableOpacity
          onPress={() => setActiveTab('playlists')}
          className={`mr-6 ${activeTab === 'playlists' ? 'border-b-2 border-red-500 pb-2' : ''}`}
        >
          <Text className={`text-xs font-bold font-sans ${activeTab === 'playlists' ? 'text-white' : 'text-zinc-500'}`}>Playlists</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('favorites')}
          className={`mr-6 ${activeTab === 'favorites' ? 'border-b-2 border-red-500 pb-2' : ''}`}
        >
          <Text className={`text-xs font-bold font-sans ${activeTab === 'favorites' ? 'text-white' : 'text-zinc-500'}`}>Liked</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          className={`${activeTab === 'history' ? 'border-b-2 border-red-500 pb-2' : ''}`}
        >
          <Text className={`text-xs font-bold font-sans ${activeTab === 'history' ? 'text-white' : 'text-zinc-500'}`}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Views Scroll */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>

        {/* PLAYLISTS TAB VIEW */}
        {activeTab === 'playlists' && (
          <View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-sans">Custom Playlists</Text>
              <TouchableOpacity
                onPress={() => setShowCreateInput(!showCreateInput)}
                className="flex-row items-center gap-1 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full"
              >
                <Plus size={12} color="#fff" />
                <Text className="text-white text-[9px] font-bold font-sans">New</Text>
              </TouchableOpacity>
            </View>

            {/* Input field overlay for creating new playlist */}
            {showCreateInput && (
              <View className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl mb-5 flex-row gap-2.5 items-center">
                <TextInput
                  placeholder="Playlist Name"
                  placeholderTextColor="#71717a"
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  className="flex-1 text-white text-xs font-sans px-3 py-2 bg-black border border-zinc-800 rounded-xl"
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleCreatePlaylist}
                  className="px-4 py-2 bg-red-650 rounded-xl justify-center"
                >
                  <Text className="text-white text-[10px] font-bold font-sans">Create</Text>
                </TouchableOpacity>
              </View>
            )}

            {playlistsLoading ? (
              <ActivityIndicator size="small" color="#d91b29" className="my-6" />
            ) : playlists.length === 0 ? (
              <Text className="text-zinc-500 text-xs italic font-sans text-center my-12">No playlists created yet.</Text>
            ) : (
              playlists.map((playlist: any) => (
                <View
                  key={playlist.id}
                  className="flex-row items-center justify-between border-b border-zinc-900 py-3.5"
                >
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/playlist-details', params: { id: playlist.id, name: playlist.name } })}
                    className="flex-row items-center flex-1 mr-4"
                  >
                    <View className="w-11 h-11 bg-zinc-900 border border-zinc-800 rounded-lg items-center justify-center">
                      <ListMusic size={20} color="#d91b29" />
                    </View>
                    <View className="ml-3.5 flex-1">
                      <Text className="text-white text-xs font-bold font-sans" numberOfLines={1}>
                        {playlist.name}
                      </Text>
                      <Text className="text-zinc-500 text-[9px] font-sans mt-0.5">
                        {playlist.songs_count || 0} tracks
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeletePlaylist(playlist.id)}
                    className="p-2"
                  >
                    <Trash size={16} color="#71717a" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* LIKED SONGS TAB VIEW */}
        {activeTab === 'favorites' && (
          <View>
            {favorites.size === 0 ? (
              <Text className="text-zinc-500 text-xs italic font-sans text-center my-12">No liked tracks yet.</Text>
            ) : (
              Array.from(favorites).map((trackId: any) => {
                // Fetch details from list or mock fallback
                // Note: History items have full track details, so we can cross-ref, or use a local db cache.
                const historyItem: any = history.find((h: any) => (h.id || h.video_id) === trackId);
                const title = historyItem?.title || "Liked Song";
                const artist = historyItem?.artist || "Unknown Artist";
                const img = historyItem?.thumbnail || historyItem?.thumbnail_url || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=120&h=120&fit=crop&q=80";

                const trackObj = {
                  id: trackId,
                  title,
                  artist,
                  thumbnail: img,
                  duration: historyItem?.duration
                };

                return (
                  <TouchableOpacity
                    key={trackId as string}
                    onPress={() => playTrack(trackObj)}
                    className="flex-row items-center border-b border-zinc-900 py-3.5"
                  >
                    <Image source={{ uri: img }} className="w-11 h-11 rounded-lg bg-zinc-900" />
                    <View className="ml-3.5 flex-1 mr-4">
                      <Text className="text-white text-xs font-bold font-sans truncate" numberOfLines={1}>{title}</Text>
                      <Text className="text-zinc-500 text-[10px] font-sans mt-0.5 truncate" numberOfLines={1}>{artist}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleFavorite(trackObj)} className="p-2">
                      <Heart size={16} color="#d91b29" fill="#d91b29" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* HISTORY TAB VIEW */}
        {activeTab === 'history' && (
          <View>
            {history.length === 0 ? (
              <Text className="text-zinc-500 text-xs italic font-sans text-center my-12">No listening history found.</Text>
            ) : (
              history.map((h: any, idx: number) => {
                const trackId = h.id || h.video_id;
                const title = h.title || "History Song";
                const artist = h.artist || "Unknown Artist";
                const img = h.thumbnail || h.thumbnail_url || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=120&h=120&fit=crop&q=80";

                const trackObj = {
                  id: trackId,
                  title,
                  artist,
                  thumbnail: img,
                  duration: h.duration
                };

                return (
                  <TouchableOpacity
                    key={trackId + "-" + idx}
                    onPress={() => playTrack(trackObj)}
                    className="flex-row items-center border-b border-zinc-900 py-3.5"
                  >
                    <Image source={{ uri: img }} className="w-11 h-11 rounded-lg bg-zinc-900" />
                    <View className="ml-3.5 flex-1 mr-4">
                      <Text className="text-white text-xs font-bold font-sans truncate" numberOfLines={1}>{title}</Text>
                      <Text className="text-zinc-500 text-[10px] font-sans mt-0.5 truncate" numberOfLines={1}>{artist}</Text>
                    </View>
                    <View className="p-1 bg-zinc-900 border border-zinc-850 rounded-full">
                      <History size={12} color="#71717a" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

      </ScrollView>

    </View>
  );
}

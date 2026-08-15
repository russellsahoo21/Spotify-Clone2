import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { useAudio } from '../../context/AudioContext';
import { Search as SearchIcon, Music, Disc, User, X } from 'lucide-react-native';
import { API_BASE } from '../../constants/api';

const CATEGORIES = ['All', 'Songs', 'Albums', 'Artists'];

const TOP_GENRES = [
  { name: 'Bollywood Hits', query: 'Arijit Singh hits', color: 'bg-red-650' },
  { name: 'Punjabi Beats', query: 'Diljit Dosanjh songs', color: 'bg-indigo-650' },
  { name: 'Lo-Fi Chill', query: 'Lofi sleep study beats', color: 'bg-teal-650' },
  { name: 'Global Pop', query: 'Taylor Swift pop hits', color: 'bg-purple-650' }
];

export default function SearchScreen() {
  const { playTrack } = useAudio();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Trigger search query
  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/music/search?q=${encodeURIComponent(searchTerm)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data || []);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [query]);

  // Filtered lists
  const filteredResults = results.filter((item: any) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Songs') return item.type === 'song' || item.videoId;
    if (activeCategory === 'Albums') return item.type === 'album';
    if (activeCategory === 'Artists') return item.type === 'artist';
    return true;
  });

  return (
    <View className="flex-1 bg-black pt-14 px-6">

      {/* Title */}
      <Text className="text-2xl font-extrabold text-white mb-4 font-sans">Search</Text>

      {/* Search Input bar */}
      <View className="w-full flex-row items-center bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 mb-5">
        <SearchIcon size={18} color="#a1a1aa" />
        <TextInput
          placeholder="What do you want to listen to?"
          placeholderTextColor="#71717a"
          value={query}
          onChangeText={setQuery}
          className="flex-1 text-white text-xs font-sans ml-3"
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} className="p-1">
            <X size={16} color="#a1a1aa" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filters (Shown only when there are query search results) */}
      {query.length > 0 && (
        <View className="mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.map(c => {
              const active = activeCategory === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setActiveCategory(c)}
                  className={`px-4 py-2 rounded-full border ${active
                      ? 'bg-white border-white'
                      : 'bg-zinc-900 border-zinc-800'
                    }`}
                >
                  <Text className={`text-[9px] font-bold font-sans ${active ? 'text-black' : 'text-zinc-400'}`}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Results View Container */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>

        {loading && (
          <ActivityIndicator size="small" color="#d91b29" className="my-6" />
        )}

        {/* Empty state: Genres list grid */}
        {!loading && query.length === 0 && (
          <View>
            <Text className="text-white text-xs font-extrabold font-sans mb-3 uppercase tracking-wider">Browse All</Text>
            <View className="flex-row flex-wrap justify-between">
              {TOP_GENRES.map((genre, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setQuery(genre.query);
                    performSearch(genre.query);
                  }}
                  className={`w-[48%] aspect-video rounded-2xl p-4 mb-4 justify-between relative overflow-hidden ${genre.color}`}
                >
                  <Text className="text-white text-xs font-extrabold font-sans leading-5 w-[80%]">{genre.name}</Text>
                  <SearchIcon size={16} color="#fff" style={{ opacity: 0.6, alignSelf: 'flex-end' }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Results entries list */}
        {!loading && query.length > 0 && filteredResults.length === 0 && (
          <Text className="text-zinc-500 text-xs italic font-sans text-center my-12">No search results found.</Text>
        )}

        {!loading && query.length > 0 && filteredResults.map((item: any, idx: number) => {
          const title = item.title || "Unknown Title";
          const artistName = item.artist || item.artists?.[0]?.name || "Unknown Artist";
          const coverArt = item.thumbnail || (item.thumbnails && item.thumbnails[0]?.url) || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=120&h=120&fit=crop&q=80";

          // Check display details based on search types
          const isArtist = item.type === 'artist';
          const isAlbum = item.type === 'album';

          return (
            <TouchableOpacity
              key={item.id || item.videoId || item.browseId || idx}
              onPress={() => {
                if (!isArtist && !isAlbum) {
                  // Standard playback track
                  playTrack({
                    id: item.id || item.videoId,
                    title: title,
                    artist: artistName,
                    thumbnail: coverArt,
                    duration: item.duration
                  }, filteredResults.filter(r => !r.type || r.type === 'song').map(r => ({
                    id: r.id || r.videoId,
                    title: r.title,
                    artist: r.artist || r.artists?.[0]?.name,
                    thumbnail: r.thumbnail || r.thumbnails?.[0]?.url,
                    duration: r.duration
                  })));
                } else {
                  // Placeholder for artist or album select
                  alert(`Selected ${isArtist ? 'Artist' : 'Album'}: ${title}`);
                }
              }}
              className="flex-row items-center border-b border-zinc-900 py-3.5"
            >
              <Image
                source={{ uri: coverArt }}
                className={`w-11 h-11 bg-zinc-900 ${isArtist ? 'rounded-full' : 'rounded-lg'}`}
              />
              <View className="ml-3.5 flex-1 mr-4">
                <Text className="text-white text-xs font-bold font-sans truncate" numberOfLines={1}>
                  {title}
                </Text>
                <Text className="text-zinc-500 text-[10px] font-sans mt-0.5 truncate" numberOfLines={1}>
                  {artistName}
                </Text>
              </View>

              {/* Type indicator Icon */}
              <View className="p-1 bg-zinc-900 rounded-full border border-zinc-800">
                {isArtist ? (
                  <User size={12} color="#71717a" />
                ) : isAlbum ? (
                  <Disc size={12} color="#71717a" />
                ) : (
                  <Music size={12} color="#d91b29" fill="#d91b29" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

      </ScrollView>

    </View>
  );
}

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Image, TextInput } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Platform } from 'react-native';
import { API_BASE } from '../constants/api';
import { X, Search, Check, Sparkles } from 'lucide-react-native';

const GENRES = [
  { id: 'Bollywood', name: 'Bollywood', emoji: '🎬' },
  { id: 'Pop', name: 'Pop', emoji: '🎤' },
  { id: 'Hip Hop', name: 'Hip Hop', emoji: '🧢' },
  { id: 'Punjabi', name: 'Punjabi', emoji: '🔥' },
  { id: 'Lo-Fi', name: 'Lo-Fi', emoji: '☕' },
  { id: 'Rock', name: 'Rock', emoji: '🎸' },
  { id: 'Electronic', name: 'Electronic', emoji: '🎛️' },
  { id: 'Acoustic', name: 'Acoustic', emoji: '🏕️' },
  { id: 'Classical', name: 'Classical & Devotional', emoji: '🎻' },
  { id: 'R&B', name: 'R&B & Soul', emoji: '🎙️' },
  { id: 'K-Pop', name: 'K-Pop & J-Pop', emoji: '✨' },
  { id: 'EDM', name: 'EDM & Dance', emoji: '⚡' },
  { id: 'Jazz', name: 'Jazz & Blues', emoji: '🎷' },
  { id: 'Indie', name: 'Indie & Folk', emoji: '🎧' },
  { id: 'Heavy Metal', name: 'Heavy Metal', emoji: '🤘' },
  { id: 'Sufi', name: 'Sufi & Ghazal', emoji: '📜' },
  { id: 'Anime', name: 'Anime & Gaming', emoji: '🎮' },
  { id: 'Latin', name: 'Latin & Reggaeton', emoji: '💃' },
  { id: 'Country', name: 'Country & Folk', emoji: '🤠' },
  { id: 'Ambient', name: 'Ambient & Chill', emoji: '🧘' },
  { id: 'Synthwave', name: 'Synthwave / Retro', emoji: '🌌' },
  { id: 'Deep House', name: 'House & Techno', emoji: '🔊' },
  { id: 'Funk', name: 'Funk & Disco', emoji: '🪩' },
  { id: 'Reggae', name: 'Reggae & Dub', emoji: '🌴' }
];

const ARTISTS = [
  { id: 'Arijit Singh', name: 'Arijit Singh', desc: 'Bollywood Soulful', image: 'https://lh3.googleusercontent.com/W_yOqnKSDYyeVOY_AsXhuAtb6rW3vCL3GtJ9DA1GxWOrJfyeSOqzvTv_TkFHijdkVPXWutASBlRFPg=w120-h120-p-l90-rj' },
  { id: 'Taylor Swift', name: 'Taylor Swift', desc: 'Global Pop Queen', image: 'https://yt3.googleusercontent.com/RCpTA6EXJQyjVFDosWOKa2SMmqkua_lA9mHPDWWciLwgqpZLz-k8rXWRF_367trrQ7up9BUwCbk6kRk=w120-h120-p-l90-rj' },
  { id: 'Diljit Dosanjh', name: 'Diljit Dosanjh', desc: 'Punjabi Wave', image: 'https://yt3.googleusercontent.com/7EYXXMXY594V8y4sZT2aawmdKgDAGTu5jNm9C-HpR3jY9cZJ0NMxS__nZKBdWZ1PUpJPjc2BAA=w120-h120-l90-rj' },
  { id: 'The Weeknd', name: 'The Weeknd', desc: 'R&B / Synthpop', image: 'https://lh3.googleusercontent.com/U-SAmNOu4TynE818gLCfKsuHZ0U5YNEtO9mrjSI9WCCKERs98LzrCal5kajBBTQNwdcisoB2Bn-pHp4=w120-h120-p-l90-rj' },
  { id: 'Drake', name: 'Drake', desc: 'Hip Hop Star', image: 'https://yt3.googleusercontent.com/MxNjcRJ-uK4Xvx7u90IhEFLQM8x9LIGTA9VCKHq5U4Wn2jOgiWaMtg-qz329SIzqnCyhdCCB3MpdAGs=w120-h120-p-l90-rj' },
  { id: 'Shreya Ghoshal', name: 'Shreya Ghoshal', desc: 'Melodious Diva', image: 'https://yt3.ggpht.com/PgINZNe0qVxgMSXKG5vF82bNN4WCC12zgWsz9I7OLs4CLF9Cn0Vxq7Xc1ToupnzXrCv0nKfe3VM=w120-c-h120-k-c0x00ffffff-no-l90-rj' },
  { id: 'Billie Eilish', name: 'Billie Eilish', desc: 'Alt-Pop / Indie', image: 'https://lh3.googleusercontent.com/tQC4rOL6xz6FhmFr0ggQExxyGbYSOsyveXVSnPBh2WjEyIzQ9pMHablLJ-0GlMBrLBlBrbWQGmzrV6KN=w120-h120-p-l90-rj' },
  { id: 'Bruno Mars', name: 'Bruno Mars', desc: 'Funk & Soul', image: 'https://lh3.googleusercontent.com/hnefGBrazRhn4Z92bdSZBUENl40ONjRiVDsmZKZh-WZ2iCKE-2c7KKR7SNcZfzLHoRyB3E6as8L87YA=w120-h120-p-l90-rj' },
  { id: 'Badshah', name: 'Badshah', desc: 'Desi Hip Hop & Party', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&auto=format&fit=crop&q=80' },
  { id: 'Ed Sheeran', name: 'Ed Sheeran', desc: 'Acoustic & Pop Hits', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80' },
  { id: 'AP Dhillon', name: 'AP Dhillon', desc: 'Indo-Canadian Beats', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&auto=format&fit=crop&q=80' },
  { id: 'Dua Lipa', name: 'Dua Lipa', desc: 'Dance Pop Queen', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=120&auto=format&fit=crop&q=80' },
  { id: 'Sidhu Moose Wala', name: 'Sidhu Moose Wala', desc: 'Punjabi Folk Rap', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&auto=format&fit=crop&q=80' },
  { id: 'BTS', name: 'BTS', desc: 'K-Pop Superstars', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=120&auto=format&fit=crop&q=80' },
  { id: 'Sonu Nigam', name: 'Sonu Nigam', desc: 'Romantic & Classical', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=120&auto=format&fit=crop&q=80' },
  { id: 'Post Malone', name: 'Post Malone', desc: 'Melodic Rap & Rock', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=120&auto=format&fit=crop&q=80' },
  { id: 'Divine', name: 'Divine', desc: 'Gully Rap Pioneer', image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=120&auto=format&fit=crop&q=80' },
  { id: 'Coldplay', name: 'Coldplay', desc: 'Stadium Rock & Melodic', image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=120&auto=format&fit=crop&q=80' },
  { id: 'Atif Aslam', name: 'Atif Aslam', desc: 'Romantic Sufi Rock', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&auto=format&fit=crop&q=80' },
  { id: 'Olivia Rodrigo', name: 'Olivia Rodrigo', desc: 'Modern Alt-Pop', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=120&auto=format&fit=crop&q=80' }
];

export default function OnboardingWizard({ visible, token, onComplete, onClose }: any) {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Genres, 2: Artists, 3: Saving
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [selectedArtists, setSelectedArtists] = useState<Set<string>>(new Set());
  const [artistSearch, setArtistSearch] = useState('');

  const toggleGenre = (genreId: string) => {
    const updated = new Set(selectedGenres);
    if (updated.has(genreId)) {
      updated.delete(genreId);
    } else {
      updated.add(genreId);
    }
    setSelectedGenres(updated);
  };

  const toggleArtist = (artistId: string) => {
    const updated = new Set(selectedArtists);
    if (updated.has(artistId)) {
      updated.delete(artistId);
    } else {
      updated.add(artistId);
    }
    setSelectedArtists(updated);
  };

  const handleNext = () => {
    if (selectedGenres.size === 0) {
      alert("Please select at least one genre!");
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    if (selectedArtists.size === 0) {
      alert("Please select at least one artist!");
      return;
    }

    setStep(3);

    try {
      const res = await fetch(`${API_BASE}/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          genres: Array.from(selectedGenres),
          artists: Array.from(selectedArtists)
        })
      });

      if (res.ok) {
        setTimeout(() => {
          onComplete();
        }, 1200);
      } else {
        alert("Failed to save preferences");
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server");
      setStep(2);
    }
  };

  const filteredArtists = ARTISTS.filter(a => 
    a.name.toLowerCase().includes(artistSearch.toLowerCase()) || 
    a.desc.toLowerCase().includes(artistSearch.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View className="flex-1 bg-black p-6 pt-12 justify-between">
        
        {/* Header with optional close button if user is re-personalizing */}
        {onClose && user?.onboarded && (
          <View className="flex-row justify-end mb-2">
            <TouchableOpacity 
              onPress={onClose}
              className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-full items-center justify-center"
            >
              <X size={18} color="#a1a1aa" />
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View className="flex-1 justify-between">
            <View className="flex-1">
              <View className="items-center mb-4">
                <View 
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: 'rgba(69, 10, 10, 0.6)',
                    borderWidth: 1,
                    borderColor: 'rgba(127, 29, 29, 0.6)',
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12
                  }}
                >
                  <Sparkles size={24} color="#ef4444" />
                </View>
                <Text className="text-2xl font-extrabold text-white text-center tracking-tight">Personalize StreamYT</Text>
                <Text className="text-zinc-400 text-xs text-center mt-1">
                  Choose your favorite genres to customize your home feed
                </Text>
                {selectedGenres.size > 0 && (
                  <View 
                    style={{
                      marginTop: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      backgroundColor: 'rgba(69, 10, 10, 0.4)',
                      borderWidth: 1,
                      borderColor: 'rgba(127, 29, 29, 0.6)',
                      borderRadius: 9999
                    }}
                  >
                    <Text className="text-red-400 text-[10px] font-bold">
                      {selectedGenres.size} {selectedGenres.size === 1 ? 'Genre' : 'Genres'} Selected
                    </Text>
                  </View>
                )}
              </View>

              <ScrollView className="flex-1 my-2" showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap justify-between pb-4">
                  {GENRES.map((g) => {
                    const active = selectedGenres.has(g.id);
                    return (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => toggleGenre(g.id)}
                        style={{
                          width: '48%',
                          paddingVertical: 14,
                          paddingHorizontal: 16,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: active ? '#fff' : '#27272a',
                          backgroundColor: active ? '#fff' : 'rgba(24, 24, 27, 0.9)',
                          marginBottom: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <View className="flex-row items-center gap-2.5 flex-1 pr-1">
                          <Text className="text-base">{g.emoji}</Text>
                          <Text 
                            numberOfLines={1} 
                            className={`text-xs font-bold ${active ? 'text-black' : 'text-zinc-300'}`}
                          >
                            {g.name}
                          </Text>
                        </View>
                        {active && <Check size={14} color="#000" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity 
              onPress={handleNext}
              activeOpacity={0.8}
              className="w-full py-4 bg-red-600 rounded-2xl items-center justify-center shadow-lg"
            >
              <Text className="text-white text-sm font-bold">Continue to Artists ({selectedGenres.size})</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View className="flex-1 justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-extrabold text-white text-center tracking-tight mb-1">Pick Your Artists</Text>
              <Text className="text-zinc-400 text-xs text-center mb-3">Choose favorite creators to generate custom recommendations</Text>
              
              {/* Artist Search Bar */}
              <View 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(24, 24, 27, 0.9)',
                  borderWidth: 1,
                  borderColor: '#27272a',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginBottom: 16
                }}
              >
                <View className="mr-2">
                  <Search size={14} color="#71717a" />
                </View>
                <TextInput
                  value={artistSearch}
                  onChangeText={setArtistSearch}
                  placeholder="Search artists..."
                  placeholderTextColor="#71717a"
                  className="flex-1 text-white text-xs py-0"
                />
                {artistSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setArtistSearch('')}>
                    <X size={14} color="#71717a" />
                  </TouchableOpacity>
                )}
              </View>

              {selectedArtists.size > 0 && (
                <View className="items-center mb-3">
                  <View 
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      backgroundColor: 'rgba(69, 10, 10, 0.4)',
                      borderWidth: 1,
                      borderColor: 'rgba(127, 29, 29, 0.6)',
                      borderRadius: 9999
                    }}
                  >
                    <Text className="text-red-400 text-[10px] font-bold">
                      {selectedArtists.size} {selectedArtists.size === 1 ? 'Artist' : 'Artists'} Selected
                    </Text>
                  </View>
                </View>
              )}
              
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap justify-between pb-4">
                  {filteredArtists.map((a) => {
                    const active = selectedArtists.has(a.id);
                    return (
                      <TouchableOpacity
                        key={a.id}
                        onPress={() => toggleArtist(a.id)}
                        style={{
                          width: '48%',
                          padding: 12,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: active ? '#ef4444' : '#27272a',
                          backgroundColor: active ? 'rgba(69, 10, 10, 0.3)' : 'rgba(24, 24, 27, 0.9)',
                          marginBottom: 12,
                          alignItems: 'center',
                          position: 'relative'
                        }}
                      >
                        {active && (
                          <View className="absolute top-2 right-2 w-5 h-5 bg-red-600 rounded-full items-center justify-center z-10">
                            <Check size={11} color="#fff" />
                          </View>
                        )}
                        <View className={`w-14 h-14 rounded-full overflow-hidden mb-2 border ${
                          active ? 'border-red-500' : 'border-zinc-800'
                        }`}>
                          <Image source={{ uri: a.image }} className="w-full h-full object-cover" />
                        </View>
                        <Text className={`text-[11px] font-bold text-center ${active ? 'text-red-500' : 'text-white'}`} numberOfLines={1}>
                          {a.name}
                        </Text>
                        <Text className="text-[8px] text-zinc-500 text-center mt-0.5" numberOfLines={1}>{a.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {filteredArtists.length === 0 && (
                    <View className="w-full py-8 items-center">
                      <Text className="text-zinc-500 text-xs">No artists match "{artistSearch}"</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>

            <View className="flex-row gap-3 pt-3">
              <TouchableOpacity 
                onPress={() => setStep(1)}
                className="w-[30%] py-4 bg-zinc-900 border border-zinc-800 rounded-2xl items-center justify-center"
              >
                <Text className="text-zinc-400 text-sm font-bold">Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleComplete}
                activeOpacity={0.8}
                className="flex-1 py-4 bg-red-600 rounded-2xl items-center justify-center shadow-lg"
              >
                <Text className="text-white text-sm font-bold">Save Preferences</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="flex-1 items-center justify-center space-y-6">
            <ActivityIndicator size="large" color="#d91b29" />
            <Text className="text-white text-base font-extrabold mt-4">Curation Active</Text>
            <Text className="text-zinc-500 text-xs text-center px-8 mt-2 leading-relaxed">
              Personalizing your stream recommendations, layout structures, and mixes...
            </Text>
          </View>
        )}

      </View>
    </Modal>
  );
}

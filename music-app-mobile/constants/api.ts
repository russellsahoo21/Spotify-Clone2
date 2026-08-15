import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiBase = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log('[API] Using environment API base:', process.env.EXPO_PUBLIC_API_URL);
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Deployed Render backend URL
  const deployedUrl = 'https://spotify-clone2-k28a.onrender.com/api';
  console.log('[API] Using deployed API base:', deployedUrl);
  return deployedUrl;
};

export const API_BASE = getApiBase();

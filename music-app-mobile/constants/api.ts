import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiBase = () => {
  const host = Constants.expoConfig?.hostUri?.split(':').shift();
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  const resolvedHost = host || defaultHost;
  
  return `http://${resolvedHost}:8000/api`;
};

export const API_BASE = getApiBase();

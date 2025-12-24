// app/index.js
import { View, Text } from "react-native";

import { useEffect } from 'react';
import { router } from 'expo-router';

export default function Page() {
  useEffect(() => {
    // Replace so there's no "Back" history entry
    router.replace('/(tabs)');
  }, []);
  return null;
}

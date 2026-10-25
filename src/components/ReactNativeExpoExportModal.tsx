import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Smartphone, 
  FolderTree, 
  FileCode2, 
  Terminal, 
  Layers,
  ChevronRight
} from 'lucide-react';

interface ReactNativeExpoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReactNativeExpoExportModal: React.FC<ReactNativeExpoExportModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeFile, setActiveFile] = useState<string>('firebaseConfig.js');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const files: Record<string, { desc: string; code: string }> = {
    'firebaseConfig.js': {
      desc: 'Firebase SDK initialization with your resturent-6210f project',
      code: `// firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const firebaseConfig = {
  apiKey: "AIzaSyAM4EP-ICf28208soV2lVeNTVRtVxZxxE0",
  authDomain: "resturent-6210f.firebaseapp.com",
  projectId: "resturent-6210f",
  storageBucket: "resturent-6210f.firebasestorage.app",
  messagingSenderId: "1016514172491",
  appId: "1:1016514172491:web:85ac0f9780236141785fce",
  measurementId: "G-GHV2YV6PGY"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// In React Native Expo, use AsyncStorage persistence for Auth
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
`
    },
    'screens/HomeScreen.tsx': {
      desc: 'Menu filtering, search food, categories carousel & food cards',
      code: `// screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ScrollView 
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function HomeScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    async function loadMenu() {
      try {
        const snap = await getDocs(collection(db, 'foodItems'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setItems(list);
      } catch (e) {
        console.warn("Error loading menu:", e);
      }
    }
    loadMenu();
  }, []);

  const filtered = items.filter(i => {
    const matchCat = selectedCategory === 'all' || i.category === selectedCategory;
    const matchQuery = i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SAVORIA</Text>
        <Text style={styles.subtitle}>Artisanal Dining & Lounge</Text>
        <TextInput
          style={styles.searchBar}
          placeholder="Search food, ingredients..."
          placeholderTextColor="#71717a"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('FoodDetail', { item })}
          >
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.cardPrice}>$\{item.price.toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f59e0b', fontFamily: 'serif' },
  subtitle: { fontSize: 13, color: '#a1a1aa', marginBottom: 12 },
  searchBar: { backgroundColor: '#18181b', color: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#27272a' },
  card: { backgroundColor: '#18181b', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
  cardImage: { width: '100%', height: 160 },
  cardInfo: { padding: 14 },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  cardDesc: { color: '#a1a1aa', fontSize: 13, marginTop: 4 },
  cardPrice: { color: '#f59e0b', fontSize: 18, fontWeight: 'bold', marginTop: 8 }
});
`
    },
    'screens/BookTableScreen.tsx': {
      desc: 'Table reservation screen saving directly to Firestore',
      code: `// screens/BookTableScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export default function BookTableScreen({ navigation }) {
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState('2026-10-20');
  const [time, setTime] = useState('07:30 PM');
  const [seatingArea, setSeatingArea] = useState('Romantic Terrace');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (!name || !phone) {
      Alert.alert('Missing Info', 'Please enter your name and phone number.');
      return;
    }
    setLoading(true);
    try {
      const refCode = 'SAV-' + Math.floor(100000 + Math.random() * 900000);
      await addDoc(collection(db, 'reservations'), {
        userId: auth.currentUser?.uid || null,
        customerName: name,
        customerPhone: phone,
        customerEmail: auth.currentUser?.email || '',
        guests,
        date,
        time,
        seatingArea,
        status: 'confirmed',
        bookingReference: refCode,
        createdAt: new Date().toISOString()
      });
      Alert.alert('Confirmed!', \`Table booked! Reference: \${refCode}\`);
      navigation.navigate('MyBookings');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Book a Table</Text>
      <Text style={styles.label}>Number of Guests</Text>
      <View style={styles.guestsRow}>
        {[1, 2, 3, 4, 6, 8].map(n => (
          <TouchableOpacity 
            key={n} 
            style={[styles.guestBtn, guests === n && styles.guestBtnActive]}
            onPress={() => setGuests(n)}
          >
            <Text style={[styles.guestText, guests === n && styles.guestTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Full Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#71717a" />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1 555-0192" placeholderTextColor="#71717a" keyboardType="phone-pad" />

      <TouchableOpacity style={styles.submitBtn} onPress={handleBook} disabled={loading}>
        <Text style={styles.submitText}>{loading ? 'Reserving...' : 'Confirm Table Reservation'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', padding: 20 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  label: { color: '#a1a1aa', fontSize: 13, marginTop: 14, marginBottom: 6 },
  guestsRow: { flexDirection: 'row', gap: 10 },
  guestBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' },
  guestBtnActive: { backgroundColor: '#f59e0b' },
  guestText: { color: '#fff', fontWeight: 'bold' },
  guestTextActive: { color: '#09090b' },
  input: { backgroundColor: '#18181b', borderRadius: 12, padding: 12, color: '#fff', borderWidth: 1, borderColor: '#27272a' },
  submitBtn: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 28 },
  submitText: { color: '#09090b', fontWeight: 'bold', fontSize: 16 }
});
`
    },
    'package.json': {
      desc: 'Expo project package.json with React Native & Firebase dependencies',
      code: `{
  "name": "savoria-restaurant-app",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "firebase": "^11.0.0",
    "@react-native-async-storage/async-storage": "1.23.1",
    "@react-navigation/native": "^6.1.18",
    "@react-navigation/bottom-tabs": "^6.6.1",
    "@react-navigation/native-stack": "^6.10.1",
    "lucide-react-native": "^0.460.0"
  }
}`
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[activeFile].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-display text-xl font-bold text-white">
                  React Native Expo Project Blueprint
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Full Stack Code
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Complete React Native Expo screens, components, and Firebase connection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick CLI Command */}
        <div className="px-6 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>npx create-expo-app restaurant-app && cd restaurant-app && npm i firebase</span>
          </div>
          <span className="text-[10px] text-zinc-500">iOS / Android / Web ready</span>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* File Explorer Sidebar */}
          <div className="w-full md:w-64 bg-zinc-950/70 border-r border-zinc-800 p-4 space-y-2 overflow-y-auto">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 mb-2">
              <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
              <span>Project Files</span>
            </div>

            {Object.keys(files).map((fileName) => (
              <button
                key={fileName}
                onClick={() => setActiveFile(fileName)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-mono flex items-center justify-between transition-colors ${
                  activeFile === fileName
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode2 className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
                  <span className="truncate">{fileName}</span>
                </div>
                {activeFile === fileName && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ))}

            <div className="pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 space-y-1">
              <p>📁 restaurant-app/</p>
              <p className="pl-3">├── 📁 screens/</p>
              <p className="pl-3">├── 📁 components/</p>
              <p className="pl-3">├── 📁 services/</p>
              <p className="pl-3">└── 📄 firebaseConfig.js</p>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
              <div>
                <span className="font-mono text-xs font-bold text-cyan-300">{activeFile}</span>
                <p className="text-[11px] text-zinc-400">{files[activeFile].desc}</p>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy File Code</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-5 flex-1 overflow-auto text-zinc-300 font-mono text-xs leading-relaxed selection:bg-cyan-500 selection:text-black">
              {files[activeFile].code}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Powered by Firebase Firestore & Authentication in Expo
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

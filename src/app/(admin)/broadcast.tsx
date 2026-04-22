import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

// Configure Notifications handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function AdminBroadcast() {
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // Request permissions for scheduling notifications locally (mocking proper push)
    const requestPerms = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Unable to schedule local notifications.');
      }
    };
    requestPerms();
  }, []);

  const sendBroadcast = async () => {
    // Mocking a push notification by triggering a local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Hackathon Ops Broadcast 📣",
        body: msg || "Update from Organizers!",
        data: { data: "goes here" },
      },
      trigger: null, // trigger immediately
    });

    Alert.alert("Broadcast Sent", "Push notification deployed! Check your device notifications.");
    setMsg('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Push Broadcasts</Text>
      
      <View style={styles.composerCard}>
        <Text style={styles.label}>Target Audience</Text>
        <View style={styles.audienceRow}>
          <TouchableOpacity style={[styles.audienceBtn, { backgroundColor: '#9d4edd' }]}>
            <Text style={styles.audienceText}>All Participants</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.audienceBtn}>
            <Text style={styles.audienceText}>Volunteers Only</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { marginTop: 24 }]}>Message Content</Text>
        <TextInput 
          style={styles.textInput}
          multiline
          numberOfLines={4}
          placeholder="e.g. Dinner is now being served in the main hall!"
          placeholderTextColor="#666"
          value={msg}
          onChangeText={setMsg}
        />

        <TouchableOpacity style={styles.sendBtn} onPress={sendBroadcast}>
          <MaterialCommunityIcons name="send" size={20} color="#fff" />
          <Text style={styles.sendBtnText}>Deploy Push Notification</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.historyTitle}>Broadcast History</Text>
      <View style={styles.historyCard}>
        <Text style={styles.historySent}>To: All Participants • 11:00 AM</Text>
        <Text style={styles.historyMsg}>"Welcome hackers! Opening ceremony begins in 15 minutes."</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  composerCard: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  label: { color: '#a0a0a0', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12 },
  audienceRow: { flexDirection: 'row', gap: 12 },
  audienceBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#2a2a2a' },
  audienceText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  textInput: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    color: '#fff',
    padding: 16,
    height: 100,
    textAlignVertical: 'top'
  },
  sendBtn: {
    backgroundColor: '#3a86ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  sendBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  historyTitle: { color: '#a0a0a0', fontSize: 14, textTransform: 'uppercase', marginTop: 32, marginBottom: 12 },
  historyCard: { backgroundColor: '#1e1e1e', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#888' },
  historySent: { color: '#a0a0a0', fontSize: 12, marginBottom: 4 },
  historyMsg: { color: '#fff', fontSize: 14, fontStyle: 'italic' }
});

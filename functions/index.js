const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendBroadcastNotification = onDocumentCreated('announcements/{docId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const announcement = snapshot.data();
  const target = announcement.target; // 'all', 'participants', 'volunteers'
  const title = announcement.isUrgent ? `🚨 ${announcement.title}` : announcement.title;
  const message = announcement.message;

  try {
    // 1. Fetch relevant users based on target
    let usersQuery = admin.firestore().collection('users');
    
    if (target !== 'all') {
      let targetRoles = [target];
      if (target === 'participants') targetRoles = ['participant'];
      if (target === 'volunteers') targetRoles = ['volunteer', 'volunteers'];
      
      usersQuery = usersQuery.where('role', 'in', targetRoles);
    }

    const usersSnapshot = await usersQuery.get();
    const tokens = [];

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.expoPushToken) {
        tokens.push(userData.expoPushToken);
      }
    });

    if (tokens.length === 0) {
      console.log('No push tokens found for target:', target);
      return;
    }

    // 2. Prepare Expo Push Notification messages
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: title,
      body: message,
      data: { announcementId: event.params.docId },
    }));

    // 3. Send to Expo via HTTP POST
    console.log(`Sending ${messages.length} notifications...`);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const data = await response.json();
    console.log('Expo Push Response:', JSON.stringify(data));

  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
});

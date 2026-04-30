const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, addDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedData() {
  console.log(`Starting seeding to ${firebaseConfig.projectId}...`);

  // 1. Seed Admin User
  const admin = {
    uid: "admin_001",
    name: "Master Admin",
    email: "admin@hackvinays.com",
    role: "admin",
    createdAt: Date.now(),
  };
  await setDoc(doc(db, "users", admin.uid), admin);
  console.log("✅ Seeded Admin");

  // 2. Seed Volunteers
  const volunteers = [
    { uid: "vol_001", name: "John Volunteer", email: "john@test.com", role: "volunteer", createdAt: Date.now() },
    { uid: "vol_002", name: "Jane Volunteer", email: "jane@test.com", role: "volunteer", createdAt: Date.now() },
  ];
  for (const v of volunteers) {
    await setDoc(doc(db, "users", v.uid), v);
  }
  console.log("✅ Seeded Volunteers");

  // 3. Seed Teams
  const teams = [
    { name: "Binary Beasts", tableNumber: "T-01", mentorName: "Dr. Smith" },
    { name: "Code Crusaders", tableNumber: "T-02", mentorName: "Prof. Oak" },
    { name: "Data Dragons", tableNumber: "T-03", mentorName: "Mr. Wayne" },
  ];
  for (const t of teams) {
    const teamRef = await addDoc(collection(db, "teams"), { ...t, members: [] });
    
    // Create a participant for each team
    const pUid = `p_${teamRef.id.substring(0, 5)}`;
    await setDoc(doc(db, "users", pUid), {
      uid: pUid,
      name: `${t.name} Captain`,
      email: `${pUid}@test.com`,
      role: "participant",
      teamId: teamRef.id,
      teamName: t.name,
      createdAt: Date.now()
    });
  }
  console.log("✅ Seeded Teams and Participants");

  // 4. Seed Events
  const events = [
    { title: "Opening Ceremony", description: "Hackathon begins!", time: "09:00 AM", date: "2024-05-15", type: "event", location: "Main Hall" },
    { title: "Lunch Break", description: "Grab your food at the cafeteria", time: "01:00 PM", date: "2024-05-15", type: "meal", location: "Cafeteria" },
    { title: "Submission Deadline", description: "All projects must be submitted via Devpost", time: "11:59 PM", date: "2024-05-16", type: "event", location: "Online" },
  ];
  for (const e of events) {
    await addDoc(collection(db, "events"), e);
  }
  console.log("✅ Seeded Events");

  // 5. Seed Announcements
  const announcements = [
    { title: "Welcome to HackVinays!", body: "We are excited to have you here. Please reach out to volunteers for any help.", type: "announce", postedBy: "Admin", createdAt: Date.now(), pinned: true },
    { title: "Wifi Credentials", body: "SSID: HackVinays_Free | Pass: Hack2024", type: "notice", postedBy: "Admin", createdAt: Date.now() },
  ];
  for (const a of announcements) {
    await addDoc(collection(db, "announcements"), a);
  }
  console.log("✅ Seeded Announcements");

  console.log("-----------------------------------------");
  console.log("🚀 ALL DUMMY DATA SEEDED SUCCESSFULLY!");
  console.log("-----------------------------------------");
  process.exit(0);
}

seedData().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

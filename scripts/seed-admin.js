const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Manually parse .env because dotenv might not be installed
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

async function seedAdmin() {
  // REPLACE THIS UID with the actual UID from Firebase Auth if you have one
  const ADMIN_UID = "master_admin_001"; 
  
  const adminData = {
    uid: ADMIN_UID,
    name: "Master Admin",
    email: "admin@hackvinays.com", // Change this to your email
    role: "admin",
    createdAt: Date.now(),
  };

  try {
    console.log(`Seeding admin user to project: ${firebaseConfig.projectId}...`);
    await setDoc(doc(db, "users", ADMIN_UID), adminData);
    console.log("✅ Successfully seeded admin account!");
    console.log("-----------------------------------------");
    console.log("Email: " + adminData.email);
    console.log("Role: " + adminData.role);
    console.log("UID: " + adminData.uid);
    console.log("-----------------------------------------");
    console.log("NOTE: Make sure to create a user with this UID/Email in Firebase Auth console.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding user:", error);
    process.exit(1);
  }
}

seedAdmin();

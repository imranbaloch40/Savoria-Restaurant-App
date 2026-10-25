const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('node:fs');
const path = require('node:path');
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../.firebaserc'), 'utf8')
);

const projectId = firebaseConfig.projects?.default;
const environmentProjectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const adminEmail = 'admindashboard@gmail.com';

if (!projectId) {
  throw new Error('The default Firebase project is not configured in .firebaserc.');
}
if (environmentProjectId && environmentProjectId !== projectId) {
  throw new Error(`Configured Firebase project mismatch: expected ${projectId}.`);
}

async function bootstrapAdmin() {
  const password = process.env.SAVORIA_INITIAL_ADMIN_PASSWORD;
  const authApp = initializeApp({
    credential: applicationDefault(),
    projectId
  });
  const auth = getAuth(authApp);

  let account;
  try {
    account = await auth.getUserByEmail(adminEmail);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    if (!password) {
      throw new Error('Set SAVORIA_INITIAL_ADMIN_PASSWORD in the environment to create the initial account.');
    }
    account = await auth.createUser({
      email: adminEmail,
      password,
      emailVerified: true,
      displayName: 'Savoria Administrator'
    });
  }

  if (password) {
    account = await auth.updateUser(account.uid, { password });
  }

  await auth.setCustomUserClaims(account.uid, {
    ...account.customClaims,
    role: 'admin'
  });
  console.log('Initial administrator role is configured. No password was logged or changed.');
}

bootstrapAdmin().catch((error) => {
  console.error('Admin bootstrap failed:', error.message);
  process.exitCode = 1;
});

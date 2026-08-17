/**
 * withCallEndedReceiver — Expo config plugin
 *
 * Copies CallEndedReceiver.kt into the generated android project
 * so that killed-app declines can notify our backend.
 */
const {
  withDangerousMod,
  withAndroidManifest,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withCallEndedReceiverSource(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidPackage = config.android?.package || 'com.expocallingapp.android';
      const packagePath = androidPackage.replace(/\./g, '/');

      // Target directory in the generated android project
      const targetDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...packagePath.split('/')
      );

      // Ensure directory exists
      fs.mkdirSync(targetDir, { recursive: true });

      // Read the source Kotlin file
      const sourcePath = path.join(projectRoot, 'plugins', 'CallEndedReceiver.kt');
      let sourceContent = fs.readFileSync(sourcePath, 'utf-8');

      // Ensure package declaration matches the android package
      sourceContent = sourceContent.replace(
        /^package .+$/m,
        `package ${androidPackage}`
      );

      // Write to android project
      const targetPath = path.join(targetDir, 'CallEndedReceiver.kt');
      fs.writeFileSync(targetPath, sourceContent, 'utf-8');

      console.log(`✅ CallEndedReceiver.kt copied to ${targetPath}`);

      return config;
    },
  ]);
}

function withCallEndedReceiverManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const androidPackage = config.android?.package || 'com.expocallingapp.android';
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];

    if (!application) return config;

    // Check if receiver already exists
    const receivers = application.receiver || [];
    const existing = receivers.find(
      (r) => r.$?.['android:name'] === '.CallEndedReceiver'
    );

    if (!existing) {
      if (!application.receiver) {
        application.receiver = [];
      }

      application.receiver.push({
        $: {
          'android:name': '.CallEndedReceiver',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': `${androidPackage}.CALL_EVENT`,
                },
              },
            ],
          },
        ],
      });

      console.log('✅ CallEndedReceiver added to AndroidManifest.xml');
    }

    return config;
  });
}

module.exports = function withCallEndedReceiver(config) {
  config = withCallEndedReceiverSource(config);
  config = withCallEndedReceiverManifest(config);
  return config;
};

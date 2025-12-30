
const fs = require('fs');
const path = require('path');

console.log('🔧 Patching ffmpeg-kit-react-native to use version 6.0.2...');

try {
  // Path to the ffmpeg-kit-react-native podspec
  const podspecPath = path.join(
    __dirname,
    '..',
    'node_modules',
    'ffmpeg-kit-react-native',
    'ffmpeg-kit-react-native.podspec'
  );

  // Check if the podspec file exists
  if (!fs.existsSync(podspecPath)) {
    console.log('⚠️  ffmpeg-kit-react-native.podspec not found. Skipping patch.');
    console.log('   This is normal if you haven\'t run expo prebuild yet.');
    process.exit(0);
  }

  // Read the podspec file
  let podspecContent = fs.readFileSync(podspecPath, 'utf8');

  // Replace version 6.0 with 6.0.2 in the download URLs
  // The podspec contains URLs like:
  // https://github.com/arthenica/ffmpeg-kit/releases/download/v6.0/ffmpeg-kit-https-6.0-ios-xcframework.zip
  // We need to change them to:
  // https://github.com/arthenica/ffmpeg-kit/releases/download/v6.0.2/ffmpeg-kit-https-6.0.2-ios-xcframework.zip
  
  const originalContent = podspecContent;
  
  // Replace download URLs
  podspecContent = podspecContent.replace(
    /https:\/\/github\.com\/arthenica\/ffmpeg-kit\/releases\/download\/v6\.0\//g,
    'https://github.com/arthenica/ffmpeg-kit/releases/download/v6.0.2/'
  );
  
  // Replace version numbers in filenames
  podspecContent = podspecContent.replace(
    /ffmpeg-kit-([a-z]+)-6\.0-ios-xcframework\.zip/g,
    'ffmpeg-kit-$1-6.0.2-ios-xcframework.zip'
  );

  // Check if any changes were made
  if (podspecContent === originalContent) {
    console.log('✅ Podspec already patched or no changes needed.');
    process.exit(0);
  }

  // Write the patched content back to the file
  fs.writeFileSync(podspecPath, podspecContent, 'utf8');

  console.log('✅ Successfully patched ffmpeg-kit-react-native.podspec');
  console.log('   All references to v6.0 have been updated to v6.0.2');
} catch (error) {
  console.error('❌ Error patching ffmpeg-kit-react-native:', error.message);
  // Don't fail the install process
  process.exit(0);
}

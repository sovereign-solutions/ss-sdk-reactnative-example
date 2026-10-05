import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { version as appVersion } from '../../app.json';

// Keep app.json's display version aligned with Android versionName and iOS MARKETING_VERSION.
const platformLabel = Platform.OS === 'ios' ? 'iOS' : 'Android';
const nativeVersion = Platform.constants.reactNativeVersion;
const reactNativeVersion =
  `${nativeVersion.major}.${nativeVersion.minor}.${nativeVersion.patch}` +
  (nativeVersion.prerelease != null ? `-${nativeVersion.prerelease}` : '');

type LoginScreenProps = {
  onExploreMaps: () => void;
  onLogin: (username: string) => void;
};

export function LoginScreen({ onExploreMaps, onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');

  const cleanUsername = username.trim();

  const handleLogin = () => {
    if (!cleanUsername) {
      return;
    }

    onLogin(cleanUsername);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* TOP LOGO AREA */}

          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/img-logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Sovereign Solutions logo"
            />
          </View>

          {/* WELCOME */}

          <Text style={styles.welcome}>Welcome!</Text>

          {/* EXPLORE MAP */}

          <Text style={styles.sectionTitle}>Explore maps without signing in.</Text>

          <TouchableOpacity style={styles.exploreButton} activeOpacity={0.8} onPress={onExploreMaps}>
            <Text style={styles.exploreButtonText}>EXPLORE MAPS</Text>
          </TouchableOpacity>

          {/* DIVIDER */}

          <View style={styles.dividerRow}>
            <View style={styles.divider} />

            <Text style={styles.dividerText}>or</Text>

            <View style={styles.divider} />
          </View>

          {/* LOGIN */}

          <Text style={styles.sectionTitle}>Sign in to access all features.</Text>

          <Text style={styles.label}>Username</Text>

          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor="#9aa8b6"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            style={styles.input}
          />

          {/* LOGIN BUTTON */}

          <TouchableOpacity
            style={[styles.loginButton, !cleanUsername && styles.loginButtonDisabled]}
            activeOpacity={0.8}
            disabled={!cleanUsername}
            onPress={handleLogin}
          >
            <Text style={[styles.loginButtonText, !cleanUsername && styles.loginButtonTextDisabled]}>
              {'⇥  Sign in'}
            </Text>
          </TouchableOpacity>

          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>App version: {appVersion}</Text>
            <Text style={styles.appInfoText}>Platform: {platformLabel}</Text>
            <Text style={styles.appInfoText}>React Native: {reactNativeVersion}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  // LOGO
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  logo: {
    width: 170,
    height: 48,
    marginLeft: -10,
  },
  // WELCOME
  welcome: {
    fontSize: 30,
    fontWeight: '800',
    color: '#223d56',
    marginBottom: 36,
  },
  // SECTION
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#223d56',
    marginBottom: 20,
  },
  // EXPLORE MAP
  exploreButton: {
    height: 68,
    borderRadius: 5,
    backgroundColor: '#0878ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exploreButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // DIVIDER
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#d4dae1',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#95a3af',
  },
  // USERNAME
  label: {
    fontSize: 16,
    color: '#223d56',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#cfd6dd',
    borderRadius: 5,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#223d56',
    marginBottom: 24,
  },
  // SIGN IN BUTTON
  loginButton: {
    height: 54,
    borderWidth: 1.5,
    borderColor: '#0878ff',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    borderColor: '#cfd6dd',
  },
  loginButtonText: {
    color: '#0878ff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginButtonTextDisabled: {
    color: '#9aa8b6',
  },
  appInfo: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
    gap: 4,
  },
  appInfoText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#607080',
    textAlign: 'center',
  },
});

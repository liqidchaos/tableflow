import React, { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../lib/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>Please restart the app and try again.</Text>
          <TouchableOpacity style={styles.button} onPress={() => this.setState({ hasError: false })}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.bg },
  title: { fontSize: 22, fontFamily: theme.fonts.serif, color: theme.colors.onSurface, marginBottom: 8 },
  message: { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 24, fontFamily: theme.fonts.sans },
  button: { backgroundColor: theme.colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: theme.radii.full },
  buttonText: { color: theme.colors.goldOn, fontFamily: theme.fonts.sansBold },
});

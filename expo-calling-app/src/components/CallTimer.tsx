/**
 * CallTimer — Live MM:SS timer for active calls
 */
import React, { useState, useEffect, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface CallTimerProps {
  startTime: Date | null;
  running: boolean;
}

export function CallTimer({ startTime, running }: CallTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && startTime) {
      // Update every second
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsed(diff);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [running, startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return <Text style={styles.timer}>{formatted}</Text>;
}

const styles = StyleSheet.create({
  timer: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.xl,
    color: theme.colors.textPrimary,
    letterSpacing: 2,
    textAlign: 'center',
  },
});

/**
 * SoundService — Manages in-call ringtones and dial tones using expo-audio
 */
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

class SoundService {
  private currentPlayer: AudioPlayer | null = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldPlayInBackground: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'mixWithOthers',
      });
      this.isInitialized = true;
    } catch (e) {
      console.warn('[SoundService] Audio mode config error:', e);
    }
  }

  /**
   * Play the outgoing dial tone ("tuuut... tuuut...") in a loop
   */
  async playRingback() {
    await this.stop();
    await this.init();

    try {
      console.log('[SoundService] 🔊 Playing outgoing dial tone...');
      const player = createAudioPlayer(require('../../assets/sounds/ringback.wav'), { downloadFirst: true });
      player.loop = true;
      player.volume = 1.0;
      player.play();
      this.currentPlayer = player;
    } catch (error) {
      console.warn('[SoundService] Could not play ringback tone:', error);
    }
  }

  /**
   * Play the incoming ringtone in a loop through the speaker
   */
  async playIncomingRingtone() {
    await this.stop();
    await this.init();

    try {
      console.log('[SoundService] 🔔 Playing incoming ringtone...');
      const player = createAudioPlayer(require('../../assets/sounds/ringtone.wav'), { downloadFirst: true });
      player.loop = true;
      player.volume = 1.0;
      player.play();
      this.currentPlayer = player;
    } catch (error) {
      console.warn('[SoundService] Could not play incoming ringtone:', error);
    }
  }

  /**
   * Stop any playing ringtone or dial tone immediately and release audio session
   */
  async stop() {
    if (this.currentPlayer) {
      try {
        this.currentPlayer.pause();
        this.currentPlayer.remove();
      } catch (e) {
        // Ignore unload/stop errors
      }
      this.currentPlayer = null;
      console.log('[SoundService] ⏹️ Stopped sounds');
    }
  }
}

export const soundService = new SoundService();

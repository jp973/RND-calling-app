import { registerRootComponent } from 'expo';
import { registerVoIPPush } from 'expo-callkit-telecom';
import App from './App';

// Register for VoIP push early in the app lifecycle before components mount
registerVoIPPush();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);

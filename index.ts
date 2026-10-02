import 'react-native-gesture-handler';
import { enableFreeze } from 'react-native-screens';
import { registerRootComponent } from 'expo';

import App from './App';

// Screens under the top one (a reader under its search results, say) stop re-rendering
// until they are shown again.
enableFreeze(true);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

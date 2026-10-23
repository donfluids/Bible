// Expo config plugin: a few keys of a physical keyboard (a Chromebook, a tablet's keyboard)
// for the generated Android activity. Left and right arrows and Ctrl+F are passed to the
// JavaScript side as a "hardwareKey" device event ("left", "right", "find"); src/keys.ts
// listens for it. Esc already works: Android treats it as Back, which closes a sheet.
// Keys typed into a text field are left alone, and every key still goes on to Android.
const { withMainActivity } = require('expo/config-plugins');

const IMPORTS = ['android.view.KeyEvent', 'android.widget.EditText', 'com.facebook.react.ReactApplication'];

const OVERRIDE = `
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (event.action == KeyEvent.ACTION_DOWN && currentFocus !is EditText) {
      val key = when {
        event.keyCode == KeyEvent.KEYCODE_DPAD_LEFT && !event.isAltPressed && event.repeatCount == 0 -> "left"
        event.keyCode == KeyEvent.KEYCODE_DPAD_RIGHT && !event.isAltPressed && event.repeatCount == 0 -> "right"
        event.keyCode == KeyEvent.KEYCODE_F && event.isCtrlPressed && event.repeatCount == 0 -> "find"
        else -> null
      }
      if (key != null) (application as? ReactApplication)?.reactHost?.currentReactContext?.emitDeviceEvent("hardwareKey", key)
    }
    return super.dispatchKeyEvent(event)
  }
`;

module.exports = function withKeyboardKeys(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('fun dispatchKeyEvent')) return cfg;
    for (const imp of IMPORTS) if (!src.includes(`import ${imp}\n`)) src = src.replace(/^(package [^\n]+\n)/, `$1import ${imp}\n`);
    const end = src.lastIndexOf('}');
    src = src.slice(0, end) + OVERRIDE + src.slice(end);
    cfg.modResults.contents = src;
    return cfg;
  });
};

import ExpoModulesCore

// The apps without a voice of their own (English, Tamil) carry this in the voice module's
// place, so they are not made larger by the library that runs the model. It has the
// module's name and nothing else; the app never calls it (src/builtinVoice).
public final class BibleVoiceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BibleVoiceNone")
  }
}

package org.riversresearch.biblevoice

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The apps without a voice of their own (English, Tamil) carry this in the voice module's
// place, so they are not made larger by the library that runs the model. It has the
// module's name and nothing else; the app never calls it (src/builtinVoice).
class BibleVoiceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BibleVoiceNone")
  }
}

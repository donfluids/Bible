package org.riversresearch.biblemedia

import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The app's side of the play bar (BibleMediaService): it shows what is being read and
// passes the bar's buttons back as "onCommand" events: play, pause, next, previous, stop.

class BibleMediaModule : Module() {
  // The service and its notification are handled on Android's main thread.
  private val main = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("BibleMedia")
    Events("onCommand")

    OnCreate {
      BibleMediaService.onCommand = { command -> sendEvent("onCommand", mapOf("command" to command)) }
    }

    OnDestroy {
      BibleMediaService.onCommand = null
      hide()
    }

    // The bar for the verse being read; starts the service the first time (reading always
    // starts with the app on screen, when Android allows a foreground service to start).
    Function("show") { title: String, text: String, playing: Boolean, labels: Map<String, String> ->
      val bar = PlayBar(
        title = title,
        text = text,
        playing = playing,
        channel = labels["channel"] ?: "Read aloud",
        previous = labels["previous"] ?: "Previous",
        play = labels["play"] ?: "Play",
        pause = labels["pause"] ?: "Pause",
        next = labels["next"] ?: "Next",
      )
      val context = appContext.reactContext?.applicationContext
      main.post {
        BibleMediaService.bar = bar
        val running = BibleMediaService.running
        if (running != null) {
          running.refresh()
        } else if (context != null) {
          try {
            val intent = Intent(context, BibleMediaService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
          } catch (e: Exception) {
            // Android refused (the app is not on screen): reading goes on without the bar.
          }
        }
      }
    }

    Function("hide") { hide() }
  }

  private fun hide() {
    main.post {
      BibleMediaService.bar = null
      BibleMediaService.running?.finish()
    }
  }
}

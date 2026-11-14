package org.riversresearch.biblemedia

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.IBinder

// The play bar while a chapter is read aloud: a media notification (previous verse,
// play or pause, next verse) and a media session, so the lock screen, headphones and a
// car show the same controls. The service runs in the foreground while reading is on,
// which lets the reading go on when the app is left. It plays nothing itself: the app
// reads, and the buttons are passed to it (BibleMediaModule).

/** What the play bar shows; set by the app (BibleMediaModule.show). */
data class PlayBar(
  val title: String,
  val text: String,
  val playing: Boolean,
  val channel: String,
  val previous: String,
  val play: String,
  val pause: String,
  val next: String,
)

class BibleMediaService : Service() {
  companion object {
    private const val CHANNEL = "reading"
    private const val ID = 7301
    const val COMMAND = "org.riversresearch.biblemedia.COMMAND"

    @Volatile var bar: PlayBar? = null
    @Volatile var running: BibleMediaService? = null
    /** Where the buttons go: the app's module while it is there. */
    @Volatile var onCommand: ((String) -> Unit)? = null
  }

  private var session: MediaSession? = null
  /** The last bar shown, for a start that comes after the reading has already stopped. */
  private var last: PlayBar? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    running = this
    session = MediaSession(this, "BibleMedia").apply {
      setCallback(object : MediaSession.Callback() {
        override fun onPlay() = send("play")
        override fun onPause() = send("pause")
        override fun onSkipToNext() = send("next")
        override fun onSkipToPrevious() = send("previous")
        override fun onStop() = send("stop")
      })
      isActive = true
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val command = intent?.getStringExtra(COMMAND)
    if (command != null) {
      // With the app gone, stop is all the bar can still do.
      if (onCommand == null && command == "stop") bar = null
      send(command)
    }
    refresh()
    // Not started again by Android after it stops the service: the app starts it.
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    running = null
    session?.release()
    session = null
    super.onDestroy()
  }

  private fun send(command: String) {
    onCommand?.invoke(command)
  }

  /**
   * Shows the play bar as it now is, or ends the service when there is none. A service
   * started in the foreground must show its notification before it may end, so a start
   * that comes after the reading stopped shows the last bar for a moment.
   */
  fun refresh() {
    val now = bar ?: last
    if (now == null) {
      finish()
      return
    }
    last = now
    val notification = build(now)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    } else {
      startForeground(ID, notification)
    }
    if (bar == null) finish()
  }

  fun finish() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    stopSelf()
  }

  private fun button(command: String, code: Int): PendingIntent =
    PendingIntent.getService(
      this,
      code,
      Intent(this, BibleMediaService::class.java).putExtra(COMMAND, command),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

  private fun build(now: PlayBar): Notification {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      // Quiet: no sound, no badge; the reading itself is the sound.
      val channel = NotificationChannel(CHANNEL, now.channel, NotificationManager.IMPORTANCE_LOW)
      channel.setShowBadge(false)
      channel.setSound(null, null)
      manager.createNotificationChannel(channel)
    }
    val session = this.session!!
    val actions = PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE or
      PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_SKIP_TO_PREVIOUS or PlaybackState.ACTION_STOP
    session.setPlaybackState(
      PlaybackState.Builder()
        .setActions(actions)
        .setState(if (now.playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED, PlaybackState.PLAYBACK_POSITION_UNKNOWN, if (now.playing) 1f else 0f)
        .build(),
    )
    session.setMetadata(
      MediaMetadata.Builder()
        .putString(MediaMetadata.METADATA_KEY_TITLE, now.title)
        .putString(MediaMetadata.METADATA_KEY_ARTIST, now.text)
        .build(),
    )
    // A tap on the bar opens the app where it was, at the chapter being read.
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL) else @Suppress("DEPRECATION") Notification.Builder(this)
    val action = { icon: Int, label: String, command: String, code: Int ->
      Notification.Action.Builder(Icon.createWithResource(this, icon), label, button(command, code)).build()
    }
    return builder
      .setSmallIcon(R.drawable.bible_media_small)
      .setContentTitle(now.title)
      .setContentText(now.text)
      .setContentIntent(open)
      // Swiping the bar away (where Android allows it) stops the reading.
      .setDeleteIntent(button("stop", 4))
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setOngoing(now.playing)
      .addAction(action(R.drawable.bible_media_previous, now.previous, "previous", 1))
      .addAction(
        if (now.playing) action(R.drawable.bible_media_pause, now.pause, "pause", 2)
        else action(R.drawable.bible_media_play, now.play, "play", 3),
      )
      .addAction(action(R.drawable.bible_media_next, now.next, "next", 5))
      .setStyle(Notification.MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0, 1, 2))
      .build()
  }
}

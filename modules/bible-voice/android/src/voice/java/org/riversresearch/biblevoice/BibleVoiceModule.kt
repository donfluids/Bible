package org.riversresearch.biblevoice

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.nio.LongBuffer
import java.util.concurrent.Executors
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.withContext

// The voice the app carries: runs its model (ONNX Runtime) on speech sounds handed over
// by the app, and plays the sound the app has shaped from the result. Nothing leaves the
// phone, and no internet is used.

class VoiceNotLoadedException : CodedException("The voice has not been loaded")

class BibleVoiceModule : Module() {
  private var session: OrtSession? = null
  private var track: AudioTrack? = null
  private var pending: Promise? = null
  private val main = Handler(Looper.getMainLooper())

  // The model works on a thread of its own, so stopping and playing never wait behind it
  // (the app's modules otherwise share one thread).
  private val modelThread = Executors.newSingleThreadExecutor { r -> Thread(r, "bible-voice-model") }.asCoroutineDispatcher()

  private val speech: AudioAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_MEDIA)
    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
    .build()
  private var hasFocus = false
  private var focusRequest: AudioFocusRequest? = null

  // Another app taking the phone's sound (a call, music started elsewhere) stops the verse;
  // reading shows as paused and goes on from that verse when the reader asks.
  private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
    if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
      main.post {
        hasFocus = false
        finish(false)
      }
    }
  }

  private fun audioManager(): AudioManager? = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  // Other sound (music, a podcast) pauses while the voice reads; release() lets it go on.
  @Suppress("DEPRECATION")
  private fun takeFocus() {
    if (hasFocus) return
    val manager = audioManager() ?: return
    val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        .setAudioAttributes(speech)
        .setOnAudioFocusChangeListener(focusListener, main)
        .build()
      focusRequest = request
      manager.requestAudioFocus(request)
    } else {
      manager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
    }
    hasFocus = granted == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
  }

  @Suppress("DEPRECATION")
  private fun dropFocus() {
    val manager = audioManager()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { manager?.abandonAudioFocusRequest(it) }
      focusRequest = null
    } else {
      manager?.abandonAudioFocus(focusListener)
    }
    hasFocus = false
  }

  override fun definition() = ModuleDefinition {
    Name("BibleVoice")

    // Reads a file the app carries (the verses' speech sounds).
    AsyncFunction("read") Coroutine { path: String ->
      withContext(modelThread) { File(path).readBytes() }
    }

    AsyncFunction("load") Coroutine { path: String ->
      withContext(modelThread) {
        if (session == null) {
          val options = OrtSession.SessionOptions()
          options.setIntraOpNumThreads(2)
          session = OrtEnvironment.getEnvironment().createSession(path, options)
        }
      }
    }

    // The sound of one phrase: 32-bit floats at the model's rate, as bytes.
    AsyncFunction("synthesize") Coroutine { ids: List<Int>, noise: Double, pace: Double, noiseW: Double ->
      withContext(modelThread) {
        val current = session ?: throw VoiceNotLoadedException()
        val env = OrtEnvironment.getEnvironment()
        val input = LongArray(ids.size) { ids[it].toLong() }
        val scales = floatArrayOf(noise.toFloat(), pace.toFloat(), noiseW.toFloat())
        OnnxTensor.createTensor(env, LongBuffer.wrap(input), longArrayOf(1, input.size.toLong())).use { inputTensor ->
          OnnxTensor.createTensor(env, LongBuffer.wrap(longArrayOf(input.size.toLong())), longArrayOf(1)).use { lengthTensor ->
            OnnxTensor.createTensor(env, FloatBuffer.wrap(scales), longArrayOf(3)).use { scalesTensor ->
              current.run(mapOf("input" to inputTensor, "input_lengths" to lengthTensor, "scales" to scalesTensor)).use { result ->
                val samples = (result.get(0) as OnnxTensor).floatBuffer
                val bytes = ByteArray(samples.remaining() * 4)
                ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer().put(samples)
                bytes
              }
            }
          }
        }
      }
    }

    // Plays a WAV (16-bit, one channel); resolves true when it has played to its end,
    // false when stopped.
    AsyncFunction("play") { wav: ByteArray, promise: Promise ->
      main.post {
        finish(false)
        try {
          val rate = ByteBuffer.wrap(wav, 24, 4).order(ByteOrder.LITTLE_ENDIAN).int
          val length = wav.size - 44
          val frames = length / 2
          takeFocus()
          val player = AudioTrack.Builder()
            .setAudioAttributes(speech)
            .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(rate).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
            .setBufferSizeInBytes(length)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()
          player.write(wav, 44, length)
          track = player
          pending = promise
          // Some phones do not report the last frame; the clock ends the verse there too.
          val ended = Runnable { if (track === player) finish(true) }
          player.setNotificationMarkerPosition(maxOf(1, frames - 1))
          player.setPlaybackPositionUpdateListener(
            object : AudioTrack.OnPlaybackPositionUpdateListener {
              override fun onMarkerReached(t: AudioTrack?) {
                ended.run()
              }

              override fun onPeriodicNotification(t: AudioTrack?) {}
            },
            main
          )
          player.play()
          main.postDelayed(ended, frames * 1000L / rate + 250)
        } catch (e: Throwable) {
          track = null
          pending = null
          promise.reject("ERR_BIBLE_VOICE_PLAY", e.message, e)
        }
      }
    }

    AsyncFunction("stop") {
      main.post { finish(false) }
    }

    // Reading has ended: the phone's sound goes back to what was playing before.
    AsyncFunction("release") {
      main.post {
        finish(false)
        dropFocus()
      }
    }

    // The app has left the screen (another app, or the phone locked): the verse stops and
    // reading shows as paused.
    OnActivityEntersBackground {
      main.post { finish(false) }
    }

    OnDestroy {
      main.post {
        finish(false)
        dropFocus()
      }
    }
  }

  private fun finish(ok: Boolean) {
    val promise = pending
    pending = null
    val player = track
    track = null
    try {
      player?.pause()
      player?.flush()
      player?.release()
    } catch (e: Throwable) {
      // already released
    }
    promise?.resolve(ok)
  }
}

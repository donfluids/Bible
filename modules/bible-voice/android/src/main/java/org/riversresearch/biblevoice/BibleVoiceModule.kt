package org.riversresearch.biblevoice

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.nio.LongBuffer

// The voice the app carries: runs its model (ONNX Runtime) on speech sounds handed over
// by the app, and plays the sound the app has shaped from the result. Nothing leaves the
// phone, and no internet is used.

class VoiceNotLoadedException : CodedException("The voice has not been loaded")

class BibleVoiceModule : Module() {
  private var session: OrtSession? = null
  private var track: AudioTrack? = null
  private var pending: Promise? = null
  private val lock = Any()
  private val main = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("BibleVoice")

    // Reads a file the app carries (the verses' speech sounds).
    AsyncFunction("read") { path: String ->
      File(path).readBytes()
    }

    AsyncFunction("load") { path: String ->
      synchronized(lock) {
        if (session == null) {
          val options = OrtSession.SessionOptions()
          options.setIntraOpNumThreads(2)
          session = OrtEnvironment.getEnvironment().createSession(path, options)
        }
      }
    }

    // The sound of one phrase: 32-bit floats at the model's rate, as bytes.
    AsyncFunction("synthesize") { ids: List<Int>, noise: Double, pace: Double, noiseW: Double ->
      synchronized(lock) {
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
          val player = AudioTrack.Builder()
            .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
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

    OnDestroy {
      main.post { finish(false) }
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

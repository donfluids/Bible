import AVFoundation
import ExpoModulesCore
import UIKit
import onnxruntime_objc

// The voice the app carries: runs its model (ONNX Runtime) on speech sounds handed over
// by the app, and plays the sound the app has shaped from the result. Nothing leaves the
// phone, and no internet is used.

internal final class VoiceNotLoadedException: Exception {
  override var reason: String {
    "The voice has not been loaded"
  }
}

internal final class VoiceOutputException: Exception {
  override var reason: String {
    "The voice returned no sound"
  }
}

private final class PlayerDelegate: NSObject, AVAudioPlayerDelegate {
  private let done: (AVAudioPlayer, Bool) -> Void

  init(done: @escaping (AVAudioPlayer, Bool) -> Void) {
    self.done = done
  }

  func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    done(player, flag)
  }

  func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
    done(player, false)
  }
}

public final class BibleVoiceModule: Module {
  private var env: ORTEnv?
  private var session: ORTSession?
  private var player: AVAudioPlayer?
  private var playerDelegate: PlayerDelegate?
  private var pending: Promise?
  private var observers: [NSObjectProtocol] = []
  private var sessionActive = false
  private let work = DispatchQueue(label: "org.riversresearch.biblevoice")

  public func definition() -> ModuleDefinition {
    Name("BibleVoice")

    // A call, Siri, another app taking the sound, or this app leaving the screen pauses
    // the player without telling it; the verse is ended as stopped, so reading shows as
    // paused and goes on from that verse when the reader returns.
    OnCreate {
      let center = NotificationCenter.default
      let stopped: (Notification) -> Void = { [weak self] _ in
        DispatchQueue.main.async {
          self?.finish(false)
        }
      }
      self.observers = [
        center.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: nil) { note in
          let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
          if raw == AVAudioSession.InterruptionType.began.rawValue {
            stopped(note)
          }
        },
        center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: nil, using: stopped)
      ]
    }

    OnDestroy {
      for observer in self.observers {
        NotificationCenter.default.removeObserver(observer)
      }
      self.observers = []
    }

    // Reads a file the app carries (the verses' speech sounds).
    AsyncFunction("read") { (path: String) -> Data in
      return try Data(contentsOf: URL(fileURLWithPath: path))
    }.runOnQueue(work)

    AsyncFunction("load") { (path: String) in
      if self.session != nil {
        return
      }
      let env = try ORTEnv(loggingLevel: ORTLoggingLevel.warning)
      let options = try ORTSessionOptions()
      try options.setIntraOpNumThreads(2)
      self.session = try ORTSession(env: env, modelPath: path, sessionOptions: options)
      self.env = env
    }.runOnQueue(work)

    // The sound of one phrase: 32-bit floats at the model's rate, as bytes.
    AsyncFunction("synthesize") { (ids: [Int], noise: Double, pace: Double, noiseW: Double) -> Data in
      guard let session = self.session else {
        throw VoiceNotLoadedException()
      }
      let input = ids.map { Int64($0) }
      let length = [Int64(ids.count)]
      let scales = [Float(noise), Float(pace), Float(noiseW)]
      let inputData = input.withUnsafeBufferPointer { NSMutableData(bytes: $0.baseAddress, length: $0.count * MemoryLayout<Int64>.stride) }
      let lengthData = length.withUnsafeBufferPointer { NSMutableData(bytes: $0.baseAddress, length: $0.count * MemoryLayout<Int64>.stride) }
      let scalesData = scales.withUnsafeBufferPointer { NSMutableData(bytes: $0.baseAddress, length: $0.count * MemoryLayout<Float>.stride) }
      let inputValue = try ORTValue(tensorData: inputData, elementType: ORTTensorElementDataType.int64, shape: [1, NSNumber(value: ids.count)])
      let lengthValue = try ORTValue(tensorData: lengthData, elementType: ORTTensorElementDataType.int64, shape: [1])
      let scalesValue = try ORTValue(tensorData: scalesData, elementType: ORTTensorElementDataType.float, shape: [3])
      let outputs = try session.run(
        withInputs: ["input": inputValue, "input_lengths": lengthValue, "scales": scalesValue],
        outputNames: ["output"],
        runOptions: nil
      )
      guard let output = outputs["output"] else {
        throw VoiceOutputException()
      }
      // A copy of its own: the model's buffer goes when its value does.
      let samples = try output.tensorData()
      return Data(bytes: samples.bytes, count: samples.length)
    }.runOnQueue(work)

    // Plays a WAV; resolves true when it has played to its end, false when stopped.
    AsyncFunction("play") { (wav: Data, promise: Promise) in
      self.finish(false)
      do {
        // Other sound (music, a podcast) pauses while the voice reads; release() lets it go on.
        let audio = AVAudioSession.sharedInstance()
        if !self.sessionActive {
          try audio.setCategory(.playback, mode: .spokenAudio, options: [])
          try audio.setActive(true)
          self.sessionActive = true
        }
        let player = try AVAudioPlayer(data: wav)
        let delegate = PlayerDelegate { [weak self] ended, ok in
          DispatchQueue.main.async {
            // Only the player still playing ends the verse: one already replaced is ignored.
            if self?.player === ended {
              self?.finish(ok)
            }
          }
        }
        player.delegate = delegate
        self.player = player
        self.playerDelegate = delegate
        self.pending = promise
        if !player.play() {
          self.finish(false)
        }
      } catch {
        self.player = nil
        self.playerDelegate = nil
        self.pending = nil
        promise.reject("ERR_BIBLE_VOICE_PLAY", error.localizedDescription)
      }
    }.runOnQueue(.main)

    AsyncFunction("stop") {
      self.finish(false)
    }.runOnQueue(.main)

    // Reading has ended: the phone's sound goes back to what was playing before.
    AsyncFunction("release") {
      self.finish(false)
      if self.sessionActive {
        self.sessionActive = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
      }
    }.runOnQueue(.main)
  }

  private func finish(_ ok: Bool) {
    let promise = pending
    pending = nil
    player?.delegate = nil
    player?.stop()
    player = nil
    playerDelegate = nil
    promise?.resolve(ok)
  }
}

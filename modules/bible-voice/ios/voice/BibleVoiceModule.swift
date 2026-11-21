import AVFoundation
import ExpoModulesCore
import UIKit

// The voice the app carries: runs its model (ONNX Runtime) on speech sounds handed over
// by the app, and plays the sound the app has shaped from the result. Nothing leaves the
// phone, and no internet is used.

internal final class VoiceNotLoadedException: Exception {
  override var reason: String {
    "The voice has not been loaded"
  }
}

internal final class VoiceFileException: Exception {
  override var reason: String {
    "Not one of the voice's own files"
  }
}

// Only the voice's two files, inside the app itself or its own storage, are read: the model
// (.onnx) and the speech sounds (.bin). Any other path is refused.
private func ownFile(_ path: String, ending: String) throws -> URL {
  let file = URL(fileURLWithPath: path).standardizedFileURL.resolvingSymlinksInPath()
  let homes = [Bundle.main.bundleURL, URL(fileURLWithPath: NSHomeDirectory())].map { $0.standardizedFileURL.resolvingSymlinksInPath().path + "/" }
  guard file.pathExtension == ending, homes.contains(where: { file.path.hasPrefix($0) }) else {
    throw VoiceFileException()
  }
  return file
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
  private var model: BVVoiceModel?
  private var player: AVAudioPlayer?
  private var playerDelegate: PlayerDelegate?
  private var pending: Promise?
  private var observers: [NSObjectProtocol] = []
  private var sessionActive = false
  private let work = DispatchQueue(label: "org.riversresearch.biblevoice")

  public func definition() -> ModuleDefinition {
    Name("BibleVoice")

    // A call, Siri or another app taking the sound pauses the player without telling it;
    // the verse is ended as stopped, so reading shows as paused and goes on from that verse
    // when the reader returns. Leaving the app does not stop it: reading goes on, with the
    // controls on the lock screen (modules/bible-media).
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
        }
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
      return try Data(contentsOf: ownFile(path, ending: "bin"))
    }.runOnQueue(work)

    AsyncFunction("load") { (path: String) in
      if self.model != nil {
        return
      }
      self.model = try BVVoiceModel(modelPath: ownFile(path, ending: "onnx").path, threads: 2)
    }.runOnQueue(work)

    // The sound of one phrase: 32-bit floats at the model's rate, as bytes.
    AsyncFunction("synthesize") { (ids: [Int], noise: Double, pace: Double, noiseW: Double) -> Data in
      guard let model = self.model else {
        throw VoiceNotLoadedException()
      }
      let input = ids.map { Int64($0) }
      let scales = [Float(noise), Float(pace), Float(noiseW)]
      let inputData = input.withUnsafeBufferPointer { Data(buffer: $0) }
      let scalesData = scales.withUnsafeBufferPointer { Data(buffer: $0) }
      return try model.synthesize(withIds: inputData, scales: scalesData)
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

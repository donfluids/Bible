import AVFoundation
import ExpoModulesCore
import MediaPlayer

// The play bar while a chapter is read aloud: the lock screen's and Control Center's
// controls (previous verse, play or pause, next verse) and what is being read. The app
// reads; the buttons are passed to it as "onCommand" events: play, pause, next, previous.
//
// Reading goes on when the app is left because it declares background audio
// (UIBackgroundModes: audio, app.config.js). Between verses, and while the next chapter
// is opened, nothing sounds for a moment; a silent sound runs under the reading so the
// phone does not put the app away in such a gap. It runs only while reading plays.

public class BibleMediaModule: Module {
  private var targets: [(MPRemoteCommand, Any)] = []
  private var keepAwake: AVAudioPlayer?

  public func definition() -> ModuleDefinition {
    Name("BibleMedia")
    Events("onCommand")

    Function("show") { (title: String, text: String, playing: Bool, _: [String: String]) in
      DispatchQueue.main.async { self.show(title: title, text: text, playing: playing) }
    }

    Function("hide") {
      DispatchQueue.main.async { self.hide() }
    }

    OnDestroy {
      DispatchQueue.main.async { self.hide() }
    }
  }

  private func show(title: String, text: String, playing: Bool) {
    if playing {
      // Spoken words that go on in the background; other sound pauses while they play.
      let audio = AVAudioSession.sharedInstance()
      try? audio.setCategory(.playback, mode: .spokenAudio, options: [])
      try? audio.setActive(true)
    }
    if targets.isEmpty {
      let center = MPRemoteCommandCenter.shared()
      let pass = { (command: MPRemoteCommand, name: String) in
        command.isEnabled = true
        let target = command.addTarget { [weak self] _ in
          self?.sendEvent("onCommand", ["command": name])
          return .success
        }
        self.targets.append((command, target))
      }
      pass(center.playCommand, "play")
      pass(center.pauseCommand, "pause")
      pass(center.togglePlayPauseCommand, "toggle")
      pass(center.nextTrackCommand, "next")
      pass(center.previousTrackCommand, "previous")
    }
    MPNowPlayingInfoCenter.default().nowPlayingInfo = [
      MPMediaItemPropertyTitle: title,
      MPMediaItemPropertyArtist: text,
      MPNowPlayingInfoPropertyPlaybackRate: playing ? 1.0 : 0.0,
    ]
    if playing {
      if keepAwake == nil { keepAwake = silence() }
      if keepAwake?.isPlaying == false { keepAwake?.play() }
    } else {
      keepAwake?.pause()
    }
  }

  private func hide() {
    for (command, target) in targets {
      command.removeTarget(target)
      command.isEnabled = false
    }
    targets = []
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    if keepAwake != nil {
      keepAwake?.stop()
      keepAwake = nil
      // Reading has ended: the sound the reader was hearing before (music) may go on.
      try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
  }

  /** One second of silence, repeated, at no volume. */
  private func silence() -> AVAudioPlayer? {
    let rate = 8000
    let samples = rate
    var wav = Data()
    func u32(_ v: Int) { var x = UInt32(v).littleEndian; wav.append(Data(bytes: &x, count: 4)) }
    func u16(_ v: Int) { var x = UInt16(v).littleEndian; wav.append(Data(bytes: &x, count: 2)) }
    wav.append("RIFF".data(using: .ascii)!)
    u32(36 + samples * 2)
    wav.append("WAVEfmt ".data(using: .ascii)!)
    u32(16)
    u16(1)
    u16(1)
    u32(rate)
    u32(rate * 2)
    u16(2)
    u16(16)
    wav.append("data".data(using: .ascii)!)
    u32(samples * 2)
    wav.append(Data(count: samples * 2))
    guard let player = try? AVAudioPlayer(data: wav) else { return nil }
    player.numberOfLoops = -1
    player.volume = 0
    return player
  }
}

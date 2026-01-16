import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MusicService {
  static final MusicService _instance = MusicService._internal();
  factory MusicService() => _instance;
  MusicService._internal();

  final AudioPlayer _player = AudioPlayer();
  bool _isPlaying = false;
  bool _isMuted = false;

  bool get isMuted => _isMuted;

  // Audio Pool for SFX
  final List<AudioPlayer> _sfxPool = [];
  final int _poolSize = 20; // Enough for rapid taps in 4 player mode
  int _poolIndex = 0;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _isMuted = prefs.getBool('is_muted') ?? false;

    await AudioPlayer.global.setAudioContext(AudioContext(
      android: AudioContextAndroid(
        isSpeakerphoneOn: true,
        stayAwake: true,
        usageType: AndroidUsageType.game,
        contentType: AndroidContentType.sonification,
        audioFocus: AndroidAudioFocus.none, 
      ),
      iOS: AudioContextIOS(
        category: AVAudioSessionCategory.playback, 
        options: {
          AVAudioSessionOptions.mixWithOthers, 
          AVAudioSessionOptions.duckOthers, 
        },
      ),
    ));

    // Initialize Pool
    for (int i = 0; i < _poolSize; i++) {
      final player = AudioPlayer();
      await player.setReleaseMode(ReleaseMode.stop); // Reset after playing
      _sfxPool.add(player);
    }

    await _player.setReleaseMode(ReleaseMode.loop);
    _updateVolume();
  }

  Future<void> toggleMute() async {
    _isMuted = !_isMuted;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_muted', _isMuted);
    
    _updateVolume();
    
    if (_isMuted) {
      if (_isPlaying) await _player.pause(); 
      // Stop all SFX
      for (var p in _sfxPool) {
        await p.stop();
      }
    } else {
      if (_isPlaying) await _player.resume();
      else playMenuMusic(); 
    }
  }

  void _updateVolume() {
    if (_isMuted) {
       _player.setVolume(0);
       for (var p in _sfxPool) p.setVolume(0);
    } else {
       _player.setVolume(0.15); 
    }
  }

  Future<void> playMenuMusic() async {
    if (_isMuted) return;
    if (_isPlaying) return;
    
    try {
      await _player.setVolume(0.15); 
      await _player.play(AssetSource('sounds/bg_music.mp3'));
      _isPlaying = true;
    } catch (e) {
      debugPrint("Music Service Error: $e");
    }
  }

  Future<void> pauseMusic() async {
    await _player.pause();
    _isPlaying = false;
  }
  
  Future<void> resumeMusic() async {
     if (_isMuted) return;
     if (!_isPlaying) {
        await _player.resume();
        _isPlaying = true;
     }
  }

  Future<void> stopMusic() async {
    await _player.stop();
    _isPlaying = false;
  }

  // Fire-and-forget SFX with Pooling
  Future<void> playSfx(String assetName, {double volume = 1.0}) async {
     if (_isMuted) return;
     
     // Get next player in pool (Round Robin)
     final player = _sfxPool[_poolIndex];
     _poolIndex = (_poolIndex + 1) % _poolSize;

     try {
        if (player.state == PlayerState.playing) {
           await player.stop(); 
        }
        await player.setVolume(volume);
        await player.play(AssetSource('sounds/$assetName'));
     } catch (e) {
        debugPrint("SFX Error: $e");
     }
  }

  void dispose() {
    _player.dispose();
    for (var p in _sfxPool) {
      p.dispose();
    }
  }
}

final musicService = MusicService();

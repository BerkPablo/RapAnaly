import 'dart:async';
import 'dart:math';
import 'dart:math';
import 'package:flutter/material.dart'; // Replaces foundation.dart to provide Alignment
import 'package:flutter/services.dart'; // Added for SystemSound
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:equatable/equatable.dart';
import '../../data/datasources/local_storage.dart';
import '../../../../services/ad_service.dart'; // Added AdService import

import 'package:audioplayers/audioplayers.dart';
import 'package:vibration/vibration.dart';
import '../../../../core/services/music_service.dart';

enum GameStatus {
  idle,
  instruction,
  waiting,
  action,
  result,
  matchOver,
  countdown
}

enum GameMode { classic, fakeOut, scoreboard, precision, brain, tapWar, cypher }

class MathQuestion {
  final String question;
  final int answer;
  final int wrongAnswer;

  MathQuestion(this.question, this.answer, this.wrongAnswer);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MathQuestion &&
          runtimeType == other.runtimeType &&
          question == other.question &&
          answer == other.answer &&
          wrongAnswer == other.wrongAnswer;

  @override
  int get hashCode =>
      question.hashCode ^ answer.hashCode ^ wrongAnswer.hashCode;
}

class GameState extends Equatable {
  final GameStatus status;
  final int? winner;
  final Set<int> disqualified;
  final Duration? reactionTime;
  final int playerCount;
  final int? highScoreMs;
  final GameMode mode;
  final Map<int, int> scores;
  final bool isYellow;
  final Set<int> readyPlayers; // Track who is holding
  final int countdownValue; // Kept for integer logic
  final int countdownMs; // Added for precision
  final bool isFirstRound;
  final Duration matchTimeRemaining;

  // New Mode State
  final Map<int, Alignment> targetAlignments; // Precision Mode targets
  final MathQuestion? currentQuestion; // Brain Mode question
  final Map<int, int> tapCounts; // Tap War counts
  // Cypher Mode State
  final String cypherTargetWord;
  final int cypherIndex; // Current slot being played (0-4)
  final String cypherCurrentLetter; // Currently displayed rotating letter
  final bool isNewHighScore;

  const GameState({
    required this.status,
    this.winner,
    this.disqualified = const {},
    this.reactionTime,
    required this.playerCount,
    this.highScoreMs,
    required this.mode,
    this.scores = const {},
    this.isYellow = false,
    this.readyPlayers = const {},
    this.countdownValue = 3,
    this.countdownMs = 3000,
    this.isFirstRound = true,
    this.matchTimeRemaining = const Duration(seconds: 30),
    this.targetAlignments = const {},
    this.currentQuestion,
    this.tapCounts = const {},
    this.cypherTargetWord = "",
    this.cypherIndex = 0,
    this.cypherCurrentLetter = "", 
    this.isNewHighScore = false,
  });

  factory GameState.initial(int playerCount, GameMode mode) {
    return GameState(
      status: GameStatus.idle,
      playerCount: playerCount,
      mode: mode,
      isYellow: false,
      readyPlayers: const {},
      countdownValue: 3,
      countdownMs: 3000,
      isFirstRound: true,
      matchTimeRemaining: const Duration(seconds: 30),
      isNewHighScore: false,
    );
  }

  GameState copyWith({
    GameStatus? status,
    int? winner,
    Set<int>? disqualified,
    Duration? reactionTime,
    int? playerCount,
    int? highScoreMs,
    GameMode? mode,
    Map<int, int>? scores,
    bool? isYellow,
    Set<int>? readyPlayers,
    int? countdownValue,
    int? countdownMs,
    bool? isFirstRound,
    Duration? matchTimeRemaining,
    Map<int, Alignment>? targetAlignments,
    MathQuestion? currentQuestion,
    Map<int, int>? tapCounts,
    String? cypherTargetWord,
    int? cypherIndex,
    String? cypherCurrentLetter,
    bool? isNewHighScore,
  }) {
    return GameState(
      status: status ?? this.status,
      winner: winner ?? this.winner,
      disqualified: disqualified ?? this.disqualified,
      reactionTime: reactionTime ?? this.reactionTime,
      playerCount: playerCount ?? this.playerCount,
      highScoreMs: highScoreMs ?? this.highScoreMs,
      mode: mode ?? this.mode,
      scores: scores ?? this.scores,
      isYellow: isYellow ?? this.isYellow,
      readyPlayers: readyPlayers ?? this.readyPlayers,
      countdownValue: countdownValue ?? this.countdownValue,
      countdownMs: countdownMs ?? this.countdownMs,
      isFirstRound: isFirstRound ?? this.isFirstRound,
      matchTimeRemaining: matchTimeRemaining ?? this.matchTimeRemaining,
      targetAlignments: targetAlignments ?? this.targetAlignments,
      currentQuestion: currentQuestion ?? this.currentQuestion,
      tapCounts: tapCounts ?? this.tapCounts,
      cypherTargetWord: cypherTargetWord ?? this.cypherTargetWord,
      cypherIndex: cypherIndex ?? this.cypherIndex,
      cypherCurrentLetter: cypherCurrentLetter ?? this.cypherCurrentLetter,
      isNewHighScore: isNewHighScore ?? this.isNewHighScore,
    );
  }

  @override
  List<Object?> get props => [
        status,
        winner,
        disqualified,
        reactionTime,
        playerCount,
        highScoreMs,
        mode,
        scores,
        isYellow,
        readyPlayers,
        countdownValue,
        countdownMs,
        isFirstRound,
        matchTimeRemaining,
        targetAlignments,
        currentQuestion,
        tapCounts,
        cypherTargetWord,
        cypherIndex,
        cypherCurrentLetter,
      ];
}

class GameNotifier extends StateNotifier<GameState> {
  // Phase 28: Tap War Debounce
  final Map<int, int> _lastTapTimes = {};

  final LocalStorage _localStorage;
  final AudioPlayer _audioPlayer = AudioPlayer();
  final AudioPlayer _ambiencePlayer =
      AudioPlayer(); // Dedicated player for Radar Pings
  // final AudioPlayer _bgMusicPlayer = AudioPlayer(); // Removed

  GameNotifier(int playerCount, this._localStorage)
      : super(GameState.initial(playerCount, GameMode.classic)) {
    // Audio Context is now handled globally in MusicService


    if (playerCount == 1) {
      _loadHighScore();
    }

    // _bgMusicPlayer moved to MusicService
  }

  Timer? _timer;
  Timer? _fakeOutTimer;
  Timer? _countdownTimer;
  Timer? _ambienceTimer;
  Timer? _matchTimer; // Added
  Stopwatch? _stopwatch;
  final Map<int, int> _lastTapTime = {}; // For Debounce logic

  // ... existing methods ...

  Future<void> _loadHighScore() async {
    final highScore =
        await _localStorage.getHighScore(state.mode, state.playerCount);
    if (mounted) {
      state = state.copyWith(highScoreMs: highScore);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _fakeOutTimer?.cancel();
    _countdownTimer?.cancel();
    _ambienceTimer?.cancel();
    _ambienceTimer?.cancel();
    _matchTimer?.cancel();
    _cypherTimer?.cancel();
    _audioPlayer.dispose();
    _ambiencePlayer.dispose();
    _ambiencePlayer.dispose();
    // _bgMusicPlayer.dispose();
    super.dispose();
  }

  void setMode(GameMode mode) {
    // Cancel ALL timers to prevent running in background on mode switch
    _stopwatch?.stop();
    _timer?.cancel();
    _fakeOutTimer?.cancel();
    _countdownTimer?.cancel();
    _matchTimer?.cancel();

    // Phase 8: Tap War defaults to 10s
    if (mode == GameMode.tapWar) {
      state = GameState.initial(state.playerCount, mode)
          .copyWith(matchTimeRemaining: const Duration(seconds: 10));
    } else if (mode == GameMode.cypher) {
        state = GameState.initial(state.playerCount, mode).copyWith(
            cypherTargetWord: _generateCypherWord(),
            cypherIndex: 0,
            cypherCurrentLetter: "A");
    } else {
      state = GameState.initial(state.playerCount, mode);
    }
    _loadHighScore();
  }

  String _generateCypherWord() {
    final words = [
      "JOKER", "CYBER", "FLASH", "SPEED", "POWER", 
      "LASER", "ROBOT", "ALIEN", "GHOST", "NEON", 
      "FORCE", "BLAST", "SHOCK", "METAL", "STORM"
    ];
    return words[Random().nextInt(words.length)];
  }

  Timer? _cypherTimer;

  void _startCypherLoop() {
    _cypherTimer?.cancel();
    _cypherTimer = Timer.periodic(const Duration(milliseconds: 80), (timer) {
      if (state.status != GameStatus.action) {
        timer.cancel();
        return;
      }
      
      // Random Letter A-Z
      final randomLetter = String.fromCharCode(65 + Random().nextInt(26));
      state = state.copyWith(cypherCurrentLetter: randomLetter);
    });
  }

  void dismissInstruction() {
    if (state.status == GameStatus.instruction) {
      state = state.copyWith(status: GameStatus.idle);
    }
  }

  void startGame() {
    bool wasFirstRound = state.isFirstRound;
    
    _timer?.cancel();
    _fakeOutTimer?.cancel();
    _timer?.cancel();
    _fakeOutTimer?.cancel();
    _countdownTimer?.cancel();
    // _matchTimer?.cancel(); // Revert 2: User wants timer to run during Wait
    _stopwatch = null;

    state = state.copyWith(
      status: GameStatus.waiting,
      disqualified: const {},
      isYellow: false,
      isFirstRound: false,
      winner: null, // Clear winner
      reactionTime: null, // Clear reaction
      readyPlayers: const {}, // Clear ready
      isNewHighScore: false, // Reset new high score flag
    );

    // Brain Mode: Skip Wait Phase for subsequent rounds (Continuous Flow)
    if (state.mode == GameMode.brain && !wasFirstRound) {
       _go();
       return;
    }

    // Tap War: SKIP Wait/Countdown. Go straight to Action.
    // Tap War Skip Removed - Follows standard Countdown flow now.

    // Timer starts at Action (_go), not here.
    // if (_matchTimer == null || !_matchTimer!.isActive) _startMatchTimer();

    // Random delay between 1000ms and 6000ms
    // Tap War: Skip Wait Phase (Immediate Action) - REMOVED to restore flow
    // if (state.mode == GameMode.tapWar) {
    //   _go();
    //   return;
    // }

    // Random delay between 1000ms and 6000ms
    // FakeOut needs longer delay to ensure random chance works: 2000-6000
    int minDelay = state.mode == GameMode.fakeOut ? 2000 : 1000;
    final int delay = minDelay + Random().nextInt(4000);

    // Timer starts HERE (Wait Phase / After Countdown) per user request
    // Timer starts HERE (Wait Phase / After Countdown) per user request
    // if (_matchTimer == null || !_matchTimer!.isActive) _startMatchTimer();

    _timer = Timer(Duration(milliseconds: delay), _go);

    if (state.mode == GameMode.fakeOut) {
      _scheduleFakeOut(totalDelay: delay);
    }
  }

  void _startCountdown() {
    state = state.copyWith(status: GameStatus.countdown, countdownValue: 3);

    // Play Robotic Countdown ONCE at the start
    _playSound('robotic_countdown.mp3');

    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.countdownValue > 1) {
        state = state.copyWith(countdownValue: state.countdownValue - 1);
        _safeVibrate(20);
      } else {
        timer.cancel();
        startGame(); // Syncs with "GO" after 3 seconds
      }
    });
  }

  // ... (startMatchTimer, go, handleInteraction, etc.)

  Future<void> _checkHighScore(int scoreVal) async {
    // Phase 28: Restore Tap War Logic (Higher is Better)
    bool isNewRecord = false;
    final storedScore = state.highScoreMs; 

    if (state.mode == GameMode.tapWar) {
       // HIGHER IS BETTER
       if (storedScore == null || scoreVal > storedScore) {
          isNewRecord = true;
       }
    } else {
       // LOWER IS BETTER
       if (storedScore == null || scoreVal < storedScore) {
          isNewRecord = true;
       }
    }

    if (isNewRecord) {
      await _localStorage.saveHighScore(
        mode: state.mode,
        playerCount: state.playerCount,
        score: scoreVal,
        lowerIsBetter: state.mode != GameMode.tapWar,
      );
      state = state.copyWith(highScoreMs: scoreVal, isNewHighScore: true);
    }
  }

  void _startMatchTimer() {
    _matchTimer?.cancel();
    if (state.mode == GameMode.scoreboard) return; // No Timer for First to 5
    if (state.mode == GameMode.cypher) return; // No Timer for Cypher (Infinite)
    // Precision 1P: Infinite Time (User Request)
    if (state.mode == GameMode.precision && state.playerCount == 1) return;
    if (state.matchTimeRemaining.inSeconds <= 0 &&
        state.mode != GameMode.tapWar)
      return; // Except TapWar which resets? No.
    // Only reset time if it's currently 0 or we just started fresh
    // If we are in a loop (Classic/FakeOut), we want to KEEP the remaining time decrementing.
    // However, GameState.initial sets it to 60s.
    // The issue is: multiple calls to _startMatchTimer should not reset matchTimeRemaining if it's already running validly.

    // Simplification: always rely on state.matchTimeRemaining unless it is 0.
    if (state.matchTimeRemaining.inSeconds <= 0) {
      final duration = state.mode == GameMode.tapWar
          ? const Duration(seconds: 10)
          : const Duration(seconds: 30);
      state = state.copyWith(matchTimeRemaining: duration);
    }
    // Note: If this function is called mid-match, it will continue from current state.matchTimeRemaining.

    _matchTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.status == GameStatus.matchOver) {
        timer.cancel();
        return;
      }

      final newTime = state.matchTimeRemaining - const Duration(seconds: 1);
      if (newTime.inSeconds <= 0) {
        // Time Up!
        timer.cancel();
        state = state.copyWith(matchTimeRemaining: Duration.zero);
        _endMatchByTime();
      } else {
        state = state.copyWith(matchTimeRemaining: newTime);
      }
    });
  }

  Future<void> _endMatchByTime() async {
    // Determine winner
    int? bestPlayer;

    if (state.mode == GameMode.tapWar) {
      // High Score for SP Tap War
      if (state.playerCount == 1) {
        final taps = state.tapCounts[1] ?? 0;
        final storedScore = state.highScoreMs;
        
        // High Score Logic (Higher is Better)
        if (storedScore == null || taps > storedScore) {
           await _localStorage.saveHighScore(
              mode: GameMode.tapWar,
              playerCount: 1,
              score: taps,
              lowerIsBetter: false);
              
           state = state.copyWith(highScoreMs: taps, isNewHighScore: true);
        }
      }

      // Cypher Mode Logic
    if (state.mode == GameMode.cypher && state.status == GameStatus.action) {
      _handleCypherInput();
      return;
    }

    // Tap War Logic: Highest Tap Count
      int maxTaps = -1;
      bool isDraw = false;

      state.tapCounts.forEach((player, count) {
        if (count > maxTaps) {
          maxTaps = count;
          bestPlayer = player;
          isDraw = false;
        } else if (count == maxTaps) {
          isDraw = true;
        }
      });

      if (isDraw) bestPlayer = null;
    } else {
      // Standard FFA Logic (Score based) for Timed Modes
      int bestScore = -1;
      bool isDraw = false;

      state.scores.forEach((player, score) {
        if (score > bestScore) {
          bestScore = score;
          bestPlayer = player;
          isDraw = false;
        } else if (score == bestScore) {
          isDraw = true;
        }
      });

      if (isDraw) bestPlayer = null;
    }

    _timer?.cancel();
    _fakeOutTimer?.cancel();

    state = state.copyWith(
      status: GameStatus.matchOver,
      winner: bestPlayer,
      isFirstRound: true,
    );

    _playSound('win.mp3');

    // Show ad after delay
    Future.delayed(const Duration(seconds: 3), () {
      adService.showInterstitialAd();
    });
  }

  // Sound Mode removed

  void _scheduleFakeOut({required int totalDelay}) {
    if (totalDelay > 1500) {
      // Randomize Fake Out: only 50% chance to show Fake (Yellow)
      if (Random().nextBool()) {
          final fakeDelay = 500 + Random().nextInt(totalDelay - 1000);
          _fakeOutTimer = Timer(Duration(milliseconds: fakeDelay), () {
            if (state.status == GameStatus.waiting) {
              _triggerFakeOut();
            }
          });
      }
    }
  }

  void _triggerFakeOut() {
    state = state.copyWith(isYellow: true);
    _safeVibrate(100);
  }

  Future<void> _go() async {
    _ambienceTimer?.cancel();
    await _ambiencePlayer.stop(); // Stop loop

    // Timer starts at startGame now.
    // if (_matchTimer == null || !_matchTimer!.isActive) _startMatchTimer();

    if (state.status != GameStatus.waiting) return;

    _stopwatch = Stopwatch()..start();

    // Mode Specific Setup on Action Start
    Map<int, Alignment> newTargets = {};
    MathQuestion? newQuestion;

    if (state.mode == GameMode.precision) {
      // Generate random targets for each player (avoiding edges)
      final rng = Random();
      for (int i = 1; i <= state.playerCount; i++) {
        // Alignment range -0.8 to 0.8 to keep inside mostly
        double x = (rng.nextDouble() * 1.6) - 0.8;
        double y = (rng.nextDouble() * 1.6) - 0.8;
        newTargets[i] = Alignment(x, y);
      }
    } else if (state.mode == GameMode.brain) {
      // Generate Math Question (Increased Difficulty/Variety)
      // Range: 1-20 Addition/Subtraction/Multiplication?
      // Keeping it simple but varied: -50 to 99
      final rng = Random();
      
      int a = rng.nextInt(50); // 0-49
      int b = rng.nextInt(50); // 0-49
      
      // 20% chance of Subtraction
      bool isSub = rng.nextInt(5) == 0;
      
      int ans;
      String qStr;
      
      if (isSub) {
         ans = a - b;
         qStr = "$a - $b = ?";
      } else {
         ans = a + b;
         qStr = "$a + $b = ?";
      }
      
      int wrong = ans + (rng.nextBool() ? 1 : -1);
      if (wrong == ans) wrong = ans + 1; // Ensure different

      newQuestion = MathQuestion(qStr, ans, wrong);
    }

    state = state.copyWith(
      status: GameStatus.action,
      targetAlignments: newTargets,
      currentQuestion: newQuestion,
    );

    // Start Match Timer for Timed Modes (Action Start)
    if ((state.playerCount > 1 && state.mode != GameMode.scoreboard) ||
        state.mode == GameMode.tapWar ||
        (state.mode == GameMode.brain && state.playerCount > 1)) {
      // Ideally check if timer is already running?
      // For Tap War, it's one round.
      // For Classic/FakeOut, it's many rounds. Timer should persist.

      // FORCE 30s for Tap War if starting fresh or if it's currently 60s default
      if (state.mode == GameMode.tapWar) {
        // Fix: Tap War should be 10 seconds fixed (requested change)
        state = state.copyWith(matchTimeRemaining: const Duration(seconds: 10));
      }

      if (_matchTimer == null || !_matchTimer!.isActive) {
        _startMatchTimer();
      }
      if (_matchTimer == null || !_matchTimer!.isActive) {
        _startMatchTimer();
      }
    } else if (state.mode == GameMode.cypher) {
       _startCypherLoop();
       _stopwatch = Stopwatch()..start(); // Start Timing
       // _startMatchTimer(); // No countdown for Cypher
    }

    _safeVibrate(50);
  }

  void handleInteraction(int playerId, {required bool isDown}) {
    if (state.disqualified.contains(playerId)) return;
    if (state.status == GameStatus.matchOver ||
        state.status == GameStatus.result) return;
    if (state.status == GameStatus.instruction) return;

    // Brain Mode: Interaction handled via handleBrainChoice ONLY during Action
    if (state.mode == GameMode.brain && state.status == GameStatus.action)
      return;
      
    // Phase 28: Tap War Global Multitouch Prevention (Debounce)
    if (state.mode == GameMode.tapWar && isDown) {
       final now = DateTime.now().millisecondsSinceEpoch;
       final last = _lastTapTimes[playerId] ?? 0;
       if (now - last < 80) return; // 80ms strict debounce
       _lastTapTimes[playerId] = now;
    }

    // Precision Mode: Interaction via handleInteraction is used for "Win" (Target Tap)
    // Misses are handled by handlePrecisionMiss

    // Multiplayer (>1): Hold to Ready logic
    if (state.playerCount > 1) {
      _handleMultiplayerInput(playerId, isDown);
    }
    // Single Player: Tap to Start / Tap to React
    else {
      _handleSinglePlayerInput(playerId, isDown);
    }
  }

  void handleBrainChoice(int playerId, int chosenAnswer) {
    if (state.status != GameStatus.action) return;
    if (state.disqualified.contains(playerId)) return;

    if (state.currentQuestion != null &&
        chosenAnswer == state.currentQuestion!.answer) {
      _handleWin(playerId);
    } else {
      _handleFalseStart(playerId);
    }
  }

  void toggleReady(int playerId) {
    if (state.status != GameStatus.idle) return;

    // Precision Ready Sound
    // User requested TAP sound for Ready, not Pistol
    if (state.mode == GameMode.precision) _playSound('tap.mp3');

    // Tap to Toggle Ready
    Set<int> newReady;
    if (state.readyPlayers.contains(playerId)) {
      // Unready
      newReady = Set<int>.from(state.readyPlayers)..remove(playerId);
    } else {
      // Ready
      newReady = Set<int>.from(state.readyPlayers)..add(playerId);
    }

    state = state.copyWith(readyPlayers: newReady);

    // Check if ALL are ready
    if (newReady.length == state.playerCount) {
      // Precision Mode: Wait for 'pistol.mp3' (approx 1s) to finish
      int delay = state.mode == GameMode.precision ? 1200 : 500;
      Future.delayed(Duration(milliseconds: delay), () {
        if (mounted) _startCountdown();
      });
    }
  }

  void handlePrecisionMiss(int playerId) {
    if (state.status == GameStatus.action &&
        !state.disqualified.contains(playerId)) {
      _handleFalseStart(playerId);
    }
  }

  void _handleMultiplayerInput(int playerId, bool isDown) {
    if (state.status == GameStatus.idle) {
      if (isDown) {
        // Ready Sound handled in UI 

        // Precision Ready Sound
        if (state.mode == GameMode.precision) _playSound('pistol.mp3');

        // Tap to Toggle Ready
        Set<int> newReady;
        if (state.readyPlayers.contains(playerId)) {
          // Unready
          newReady = Set<int>.from(state.readyPlayers)..remove(playerId);
        } else {
          // Ready
          newReady = Set<int>.from(state.readyPlayers)..add(playerId);
        }

        state = state.copyWith(readyPlayers: newReady);

        // Check if ALL are ready
        if (newReady.length == state.playerCount) {
          // Precision Mode: Wait for 'pistol.mp3' (approx 1s) to finish
          int delay = state.mode == GameMode.precision ? 1200 : 500;
          Future.delayed(Duration(milliseconds: delay), () {
            if (mounted) _startCountdown();
          });
        }
      }
      // Note: No "Release" logic needed for Tap-to-Ready
    } else if (state.status == GameStatus.waiting) {
      if (isDown) {
        // Tap during waiting -> False Start!
        // logic: if they lifted finger (allowed) then tapped too early (not allowed)
        _handleFalseStart(playerId);
      }
      // Note: We NO LONGER punish releasing (!isDown) during waiting.
      // This allows "Lift" strategy.
    } else if (state.status == GameStatus.countdown) {
      // IGNORE CLICKS during Countdown (3-2-1) as requested.
      // Previously: _handleFalseStart(playerId);
      return;
    } else if (state.status == GameStatus.action) {
      if (state.mode == GameMode.tapWar) {
        // Tap War: Increment Tap Count
        if (isDown) {
          // Only count down events
          // SINGLE TOUCH ENFORCEMENT:
          // In Flutter, multi-touch events come in parallel.
          // We can prevent multi-finger spam by ensuring a small debounce or checking pointer count?
          // Pointer count is UI side. Logic side: limited by human speed.
          // But user said "sadece tek olmalı" (should be single).
          // If they mean "One finger at a time on screen", that's UI/Gesture.
          // If they mean "Only one tap counted per frame/sequence", that's here.

          // He likely means avoiding "Machine gun" tapping with 4 fingers.
          // Since `handleInteraction` is called per touch, 4 fingers = 4 calls.
          // We can add a debounce per player? E.g. max 15 taps/sec (66ms).
          // Let's implement a simple 50ms cooldown per player.
          // We need a map for debounce. Since we don't have it in state, we can use a class field (not persisted in state is fine for this ephemeral logic).
          // But Statifier is strictly immutable state focused? No, we can have private fields.

          // See _lastTapTime definition I will add to class.
          final now = DateTime.now().millisecondsSinceEpoch;
          final last = _lastTapTime[playerId] ?? 0;
          if (now - last < 80)
            return; // 80ms Debounce (~12 taps/sec max). Prevents multi-finger instant counts.
          _lastTapTime[playerId] = now;

          final current = state.tapCounts[playerId] ?? 0;

          // SILENCE Tap Sound for Gameplay (User Request)
          // _playSound('tap.mp3'); 
          
          state = state.copyWith(
            tapCounts: {...state.tapCounts, playerId: current + 1},
          );
        }
      } else {
        // Standard Reaction: Win on Release OR Tap
        if (isDown) {
          // Tap to Win (Lift Strategy)
          _handleWin(playerId);
        } else {
          // Release to Win (Hold Strategy)
          _handleWin(playerId);
        }
      }
    }
  }

  void _handleSinglePlayerInput(int playerId, bool isDown) {
    if (!isDown) return;

    // Ready Sound handled in UI

    // Precision Ready Sound
    if (state.mode == GameMode.precision) _playSound('pistol.mp3');

    if (state.status == GameStatus.idle) {
      _startCountdown();
    } else if (state.status == GameStatus.waiting) {
      _handleFalseStart(playerId);
    } else if (state.status == GameStatus.action) {
      if (state.mode == GameMode.tapWar) {
        // SP Tap War
        final current = state.tapCounts[playerId] ?? 0;
        state = state
            .copyWith(tapCounts: {...state.tapCounts, playerId: current + 1});
      } else if (state.mode == GameMode.cypher) {
        _handleCypherInput();
      } else {
        _handleWin(playerId);
      }
    }
  }

  void _handleFalseStart(int playerId) {
    // If FakeOut mode and currently Yellow => Lose instantly
    // Standard False start
    Set<int> newDisqualified = Set<int>.from(state.disqualified)
      ..add(playerId); // Always disqualify initially logic

    // Precision: Allow Reset (startGame) to happen, so targets reset.
    // Disqualification is temporary (cleared by startGame).
    // Precision: Allow Reset (startGame) to happen, so targets reset.
    // Disqualification is temporary (cleared by startGame).
    _timer?.cancel(); // Cancel main start timer
    _fakeOutTimer?.cancel();
    _countdownTimer?.cancel();
    // For Precision, we WANT to restart the round to reset targets.
    // startGame() will clear disqualified.
    // But we DON'T want to stop Match Timer?
    // _handleFalseStart DOES NOT cancel _matchTimer. So it keeps running. Correct.

    // Decrease score (MP only)
    // Decrease score (MP only, Non-TapWar)
    if (state.playerCount > 1 && state.mode != GameMode.tapWar) {
      final currentScore = state.scores[playerId] ?? 0;
      state =
          state.copyWith(scores: {...state.scores, playerId: currentScore - 1});
    }

    state = state.copyWith(
      disqualified: newDisqualified,
      isYellow: false,
      readyPlayers: const {}, // Clear ready status
    );
    // False Start!
    _playSound('wrong.mp3');
    _safeVibrate(50);

    // Auto-reset
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) {
        startGame(); // LOOP: Go straight to Waiting phase, skipping Idle
      }
    });
  }

  void _handleWin(int playerId) {
    _stopwatch?.stop();
    final reaction = _stopwatch?.elapsed;

    state = state.copyWith(
      reactionTime: reaction,
      winner: playerId,
      readyPlayers: const {}, // Clear ready
    );

    _playSound('win.mp3');
    _safeVibrate(200);

    // Increment Score logic
    if (state.playerCount > 1 && state.mode != GameMode.tapWar) {
       final currentScore = state.scores[playerId] ?? 0;
       final newScores = Map<int, int>.from(state.scores);
       newScores[playerId] = currentScore + 1;
       state = state.copyWith(scores: newScores);
    } else if (state.playerCount == 1 && reaction != null) {
       _checkHighScore(reaction.inMilliseconds);
    }

    state = state.copyWith(status: GameStatus.result);

    // Auto-reset / Show Result
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
         if (state.mode == GameMode.scoreboard) {
            // FIRST TO 5 MODE
            // firstOrNull fallback for older Dart versions if needed
            final winners = state.scores.entries.where((e) => e.value >= 5);
            final winner = winners.isNotEmpty ? winners.first : null;
            
            if (winner != null) {
              state = state.copyWith(status: GameStatus.matchOver, winner: winner.key);
              Future.delayed(const Duration(seconds: 2), () => adService.showInterstitialAd());
            } else {
              startGame(); 
            }
         } else {
             // LOOP
             startGame(); 
         }
      }
    });
  }

  void reset() {
    state = state.copyWith(
      status: GameStatus.idle,
      disqualified: const {},
      reactionTime: null,
      winner: null,
      readyPlayers: const {},
      isYellow: false,
    );
    _ambienceTimer?.cancel();
    _ambiencePlayer.stop();
  }

  Future<void> _playSound(String fileName) async {
    if (musicService.isMuted) return;
    // Improve robustness for Sound Mode
    // 1. Force stop previous
    await _audioPlayer.stop();

    // 2. Set Volume and Rate explicitly
    await _audioPlayer.setVolume(1.0);
    await _audioPlayer.setPlaybackRate(1.0); // Reset in case UI changed it

    try {
      // 3. Set Source and Play
      // NOTE: AssetSource('sounds/$fileName') -> 'assets/sounds/$fileName'
      await _audioPlayer.play(AssetSource('sounds/$fileName'));

      // Alternative Strategy if play() fails frequently on 6.x:
      // await _audioPlayer.setSource(AssetSource('sounds/$fileName'));
      // await _audioPlayer.resume();
    } catch (e) {
      debugPrint('GameProvider: Audio Error: $e');
    }
  }

  void _safeVibrate([int duration = 50]) {
    Vibration.hasVibrator().then((has) {
      if (has ?? false) {
        Vibration.vibrate(duration: duration);
      }
    });
  }

  void _handleCypherInput() {
    if (state.status != GameStatus.action) return;

    final targetLetter = state.cypherTargetWord[state.cypherIndex];
    if (state.cypherCurrentLetter == targetLetter) {
        // MATCH!
        _playSound('new_shot.mp3');
        _safeVibrate();
        
        final nextIndex = state.cypherIndex + 1;
        if (nextIndex >= state.cypherTargetWord.length) {
          // WIN
          _cypherTimer?.cancel();
          _matchTimer?.cancel();
          _stopwatch?.stop();
          final taken = _stopwatch?.elapsed;
          
          _playSound('win.mp3'); // WIN SOUND

          state = state.copyWith(
             cypherIndex: nextIndex, // Lock all
             status: GameStatus.matchOver, // Go directly to result dialog
             winner: 1, // SP Win
             reactionTime: taken, 
          );
          
          if (taken != null) _checkHighScore(taken.inMilliseconds);
          
          // No wait, no delay. Immediate pop-up via matchOver.
        } else {
          // Next Letter
          state = state.copyWith(cypherIndex: nextIndex);
        }
    } else {
       // FAIL!
       _playSound('wrong.mp3'); 
       _safeVibrate();
       // Reset to 0
       state = state.copyWith(cypherIndex: 0);
       // Trigger Shake via Disqualified hack
       state = state.copyWith(disqualified: {999}); 
       Future.delayed(const Duration(milliseconds: 100), () {
          if (mounted) state = state.copyWith(disqualified: {});
       });
    }
  }
}

final gameProviderFamily =
    StateNotifierProvider.family<GameNotifier, GameState, int>(
        (ref, playerCount) {
  return GameNotifier(playerCount, LocalStorage());
});

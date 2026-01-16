import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/game_provider.dart';
import '../widgets/player_area.dart';
import '../widgets/shake_widget.dart'; // Added
import '../../../../services/ad_service.dart';
import '../../../../core/services/music_service.dart'; // Added Music Service

class GameScreen extends ConsumerStatefulWidget {
  final int playerCount;
  final GameMode initialMode;

  const GameScreen({
    super.key,
    required this.playerCount,
    this.initialMode = GameMode.classic,
  });

  @override
  ConsumerState<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends ConsumerState<GameScreen> {
  @override
  void initState() {
    super.initState();
    // Schedule mode setting after first frame to avoid "modifying provider during build"
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(gameProviderFamily(widget.playerCount).notifier).setMode(widget.initialMode);
    });
    
    // Pause Music during Game
    musicService.pauseMusic();
  }

  final ShakeController _shakeController = ShakeController();

  @override
  void dispose() {
    _shakeController.dispose();
    
    // Resume Music on Exit
    musicService.resumeMusic();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Listen for matchOver state
    ref.listen<GameState>(gameProviderFamily(widget.playerCount), (previous, next) {
      if (next.status == GameStatus.matchOver && previous?.status != GameStatus.matchOver) {
        // Play Result Sound
        musicService.playSfx('result.mp3'); 
        _showMatchResultDialog(context, ref, next.winner);
      }
      
      // SHAKE: Trigger on disqualified count increase (False Start)
      if (next.disqualified.length > (previous?.disqualified.length ?? 0)) {
         _shakeController.shake();
      }

      // EXPLODE: Trigger logic removed
    });
    
    // Watch provider
    final gameState = ref.watch(gameProviderFamily(widget.playerCount));
    final gameNotifier = ref.read(gameProviderFamily(widget.playerCount).notifier);

    return Scaffold(
      body: Stack(
        children: [
          // 1. Shakeable Game Layout
          ShakeWidget(
            controller: _shakeController,
            child: _buildLayout(widget.playerCount, gameState, gameNotifier),
          ),
          
          // 2. Scanline Overlay (Removed)

          // 3. UI Overlay (Close Button)
          Positioned(
            top: 40,
            left: 16,
            child: GestureDetector(
              onTap: () {
                   musicService.playSfx('exit.mp3', volume: 0.5); 
                   if (context.mounted) Navigator.of(context).maybePop();
              },
              child: Container(
                padding: const EdgeInsets.all(12), // Increase Hit Area
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white30, width: 1.5),
                  boxShadow: [
                     BoxShadow(color: Colors.black26, blurRadius: 8, spreadRadius: 1),
                  ],
                ),
                child: const Icon(Icons.close_rounded, color: Colors.white, size: 26),
              ),
            ),
          ),
          
          // 4. Match Timer (Multiplayer Only OR Tap War 1P)
          // EXCEPTION: Hide in Scoreboard (First to 5) mode as it has no timer
          if ((widget.playerCount > 1 || gameState.mode == GameMode.tapWar) && gameState.mode != GameMode.scoreboard) 
             Positioned.fill(
               child: IgnorePointer( // Don't block touches
                 child: Align(
                   alignment: (gameState.mode == GameMode.tapWar && widget.playerCount == 1) 
                      ? const Alignment(0, -0.8) // Move higher for Tap War 1P
                      : Alignment.center,
                   child: Opacity(
                     opacity: 1.0,
                     child: _buildTimer(gameState.matchTimeRemaining),
                   ),
                 ),
               ),
             ),
        ],
      ),
    );
  }

  Widget _buildLayout(int count, GameState state, GameNotifier notifier) {
    // Determine the base layout
    Widget layout;
    if (count == 1) {
      layout = Column(
        children: [
          _buildPlayer(1, state, notifier),
        ],
      );
    } else if (count == 2) {
      layout = Column(
        children: [
          _buildPlayer(2, state, notifier, quarterTurns: 2), // Top player (rotated 180)
          _buildPlayer(1, state, notifier), // Bottom player
        ],
      );
    } else if (count == 3) {
      // T-shape: 2 top, 1 bottom
      layout = Column(
        children: [
          Expanded(
            child: Row(
              children: [
                _buildPlayer(2, state, notifier, quarterTurns: 2), // Top Left
                _buildPlayer(3, state, notifier, quarterTurns: 2), // Top Right
              ],
            ),
          ),
          _buildPlayer(1, state, notifier), // Bottom
        ],
      );
    } else if (count == 4) {
      // 2x2 Grid
      layout = Column(
        children: [
          Expanded(
            child: Row(
              children: [
                _buildPlayer(2, state, notifier, quarterTurns: 2), // Top Left
                _buildPlayer(3, state, notifier, quarterTurns: 2), // Top Right
              ],
            ),
          ),
          Expanded(
            child: Row(
              children: [
                _buildPlayer(4, state, notifier), // Bottom Left
                _buildPlayer(1, state, notifier), // Bottom Right
              ],
            ),
          ),
        ],
      );
    } else {
      layout = const Center(child: Text("Invalid Player Count"));
    }

    // Wrap with Brain Question Overlay if needed
    return Stack(
      children: [
        layout,
      ],
    );
  }

  Widget _buildPlayer(int id, GameState state, GameNotifier notifier, {int quarterTurns = 0}) {
    return PlayerArea(
      playerId: id,
      state: state,
      notifier: notifier, // Updated signature
      quarterTurns: quarterTurns,
    );
  }

  void _showMatchResultDialog(BuildContext context, WidgetRef ref, int? winnerId) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.black, // Logic: Black BG
              border: Border.all(color: Colors.cyanAccent, width: 2), // Neon Cyan Border
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: Colors.cyanAccent.withOpacity(0.3), blurRadius: 16),
              ],
            ),
            child: Builder(
              builder: (context) {
                // Show Ad when dialog builds
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  adService.showInterstitialAd();
                });
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.emoji_events, size: 80, color: Colors.amberAccent), // TROPHY
                    const SizedBox(height: 16),
                    Text(
                      _getResultTitle(ref, winnerId), // Helper for Title
                      style: GoogleFonts.orbitron(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _getResultSubtitle(ref, winnerId), // Helper for Subtitle/Winner
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: winnerId != null ? Colors.amberAccent : Colors.white70, // Amber for winner
                        fontSize: 24, // Larger
                        fontWeight: FontWeight.w900,
                        shadows: winnerId != null ? [
                           const Shadow(color: Colors.amber, blurRadius: 20),
                        ] : [],
                      ),
                    ),
                    if (ref.read(gameProviderFamily(widget.playerCount)).reactionTime != null && 
                        ref.read(gameProviderFamily(widget.playerCount)).mode != GameMode.tapWar) ...[
                        const SizedBox(height: 8),
                        // Score / Time Display
                        // Hidden for Precision Mode (User Request) and Multiplayer (User Request)
                        if (ref.read(gameProviderFamily(widget.playerCount)).mode != GameMode.precision && 
                            widget.playerCount == 1)
                          Text(
                            "${(ref.read(gameProviderFamily(widget.playerCount)).reactionTime!.inMilliseconds / 1000).toStringAsFixed(3)}s",
                            style: GoogleFonts.orbitron(
                              fontSize: 40,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              shadows: [
                                const Shadow(
                                  blurRadius: 20,
                                  color: Color(0xFF39FF14),
                                )
                              ],
                            ),
                          ),
                    ],
                    if (ref.read(gameProviderFamily(widget.playerCount)).isNewHighScore && 
                        !(ref.read(gameProviderFamily(widget.playerCount)).mode == GameMode.tapWar && widget.playerCount == 1)) ...[
                        const SizedBox(height: 12),
                        const SizedBox(height: 12),
                        Text(
                          "NEW BEST SCORE!",
                          style: GoogleFonts.orbitron(
                            color: Colors.amberAccent, // Gold
                            fontSize: 24, // Larger
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2.0,
                            shadows: [
                               const Shadow(color: Colors.amber, blurRadius: 20),
                               const Shadow(color: Colors.white, blurRadius: 5),
                            ],
                          ),
                        ),
                    ],
                    const SizedBox(height: 32),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        TextButton(
                          onPressed: () {
                            musicService.playSfx('menu_button.mp3');
                            Navigator.of(context).pop(); // Close dialog
                            Navigator.of(context).pop(); // Back to Menu
                          },
                          child: Text("MENU", style: TextStyle(color: Colors.white54)),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.amberAccent, // Gold button
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () {
                             musicService.playSfx('rematch_button.mp3');
                             Navigator.of(context).pop();
                             // Restart SAME Mode
                             final currentMode = ref.read(gameProviderFamily(widget.playerCount)).mode;
                             ref.read(gameProviderFamily(widget.playerCount).notifier).setMode(currentMode); 
                          }, 
                          child: const Text("REMATCH", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ),
        );
      },
    );
  }
  Widget _buildTimer(Duration timeRemaining) {
    // Format mm:ss
    final minutes = timeRemaining.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = timeRemaining.inSeconds.remainder(60).toString().padLeft(2, '0');
    
    // Alert color if < 10 seconds
    final bool isLowTime = timeRemaining.inSeconds <= 10 && timeRemaining.inSeconds > 0;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
         color: Colors.black.withOpacity(0.4),
         borderRadius: BorderRadius.circular(30),
         border: Border.all(
            color: isLowTime ? const Color(0xFFFF073A).withOpacity(0.8) : Colors.white24,
            width: 1.5,
         ),
         boxShadow: [
            BoxShadow(
               color: isLowTime ? const Color(0xFFFF073A).withOpacity(0.3) : Colors.black12,
               blurRadius: 15,
               spreadRadius: 1,
            )
         ]
      ),
      child: Text(
        _formatTime(timeRemaining),
        style: GoogleFonts.orbitron(
           color: isLowTime ? const Color(0xFFFF073A) : Colors.white, 
           fontSize: 32, 
           fontWeight: FontWeight.bold,
           letterSpacing: 3,
           shadows: [
             Shadow(color: isLowTime ? Colors.red : Colors.blueAccent.withOpacity(0.5), blurRadius: 8),
           ],
           fontFeatures: [const FontFeature.tabularFigures()],
        ),
      ),
    );
  }

  String _formatTime(Duration d) {
      return d.inSeconds.toString();
  }

  String _getResultTitle(WidgetRef ref, int? winnerId) {
     final state = ref.read(gameProviderFamily(widget.playerCount));
     if (state.mode == GameMode.tapWar && widget.playerCount == 1) {
        return "TIME'S UP!"; 
     }
     if (state.mode == GameMode.cypher) {
        return "HARİKA!"; // "Great!"
     }
     return "MATCH OVER";
  }

  String _getResultSubtitle(WidgetRef ref, int? winnerId) {
     final state = ref.read(gameProviderFamily(widget.playerCount));
     if (state.mode == GameMode.tapWar && widget.playerCount == 1) {
        final score = state.tapCounts[1] ?? 0;
        if (state.isNewHighScore) {
           return "NEW BEST SCORE: $score";
        }
        return "SCORE: $score";
     }
     if (state.mode == GameMode.cypher && state.reactionTime != null) {
        final seconds = (state.reactionTime!.inMilliseconds / 1000).toStringAsFixed(3);
        return "$seconds s";
     }
     
     if (winnerId == 101) return "TEAM 1 WINS!";
     if (winnerId == 102) return "TEAM 2 WINS!";
     if (winnerId != null) return "PLAYER $winnerId WINS!";
     return "DRAW!";
  }
}



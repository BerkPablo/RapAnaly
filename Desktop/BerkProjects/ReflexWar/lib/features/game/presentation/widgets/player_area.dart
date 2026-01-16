import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import 'dart:math';
import '../providers/game_provider.dart';
import '../../../../core/services/music_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'shake_widget.dart';

class PlayerArea extends StatefulWidget {
  final int playerId;
  final GameState state;
  final GameNotifier notifier;
  final int quarterTurns;

  const PlayerArea({
    super.key,
    required this.playerId,
    required this.state,
    required this.notifier,
    this.quarterTurns = 0,
  });

  @override
  State<PlayerArea> createState() => _PlayerAreaState();
}

class _PlayerAreaState extends State<PlayerArea> with SingleTickerProviderStateMixin {
  late AnimationController _scaleController;
  late Animation<double> _scaleAnimation;
  final ShakeController _shakeController = ShakeController(); // Added ShakeController

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100), // Fast crush
      reverseDuration: const Duration(milliseconds: 100),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _shakeController.dispose(); // Dispose ShakeController
    super.dispose();
  }

  @override
  void didUpdateWidget(PlayerArea oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Winner Shake Logic (Multiplayer Only)
    if (widget.state.playerCount > 1 &&
        widget.state.status == GameStatus.result &&
        oldWidget.state.status != GameStatus.result &&
        widget.state.winner == widget.playerId) {
      _shakeController.shake();
    }
  }

  void _triggerBounce() {
    _scaleController.forward().then((_) => _scaleController.reverse());
  }

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    String text = "";
    Color textColor = Colors.white;

    // Flag to check if we should show standard disqualified screen, or custom Brain Mode feedback
    // Logic: Show standard disqualified IF ((It is NOT Brain Mode) OR (It IS Brain Mode BUT status is Waiting))
    bool showStandardDisqualified = widget.state.disqualified.contains(widget.playerId) && (widget.state.mode != GameMode.brain || widget.state.status == GameStatus.waiting);

    if (showStandardDisqualified) {
      backgroundColor = Colors.grey.shade900;
      if (widget.state.status == GameStatus.waiting) {
         text = "TOO EARLY!"; 
      } else if (widget.state.mode == GameMode.precision) {
         text = "MISSED!"; 
      } else {
         text = "FALSE START!";
      }
      textColor = Colors.red;
    } else {
      switch (widget.state.status) {
        case GameStatus.instruction: 
          backgroundColor = Colors.black;
          text = "";
          break;
        case GameStatus.countdown:
          backgroundColor = Colors.grey.shade900; 
          text = widget.state.countdownValue.toString();
          textColor = Colors.white;
          break;
        case GameStatus.idle:
          if (widget.state.playerCount > 1) {
             if (widget.state.readyPlayers.contains(widget.playerId)) {
               backgroundColor = Colors.greenAccent; 
               text = "READY";
               textColor = Colors.black; 
             } else {
               backgroundColor = Colors.grey.shade800;
               text = "TAP TO READY"; 
             }
          } else {
             backgroundColor = Colors.grey.shade800;
             text = "TAP TO START";
          }
          break;
        case GameStatus.waiting:
          if (widget.state.mode == GameMode.fakeOut && widget.state.isYellow) {
             backgroundColor = Colors.yellowAccent;
             text = "WAIT!";
             textColor = Colors.black;
          } else {
             backgroundColor = const Color(0xFFFF073A); // Neon Red
             text = "WAIT";
             textColor = Colors.black; 
          }
          break;
        case GameStatus.action:
          backgroundColor = const Color(0xFF39FF14); // Neon Green
          text = "TAP!";
          if (widget.state.mode == GameMode.precision) text = "";
          if (widget.state.mode == GameMode.brain) {
             backgroundColor = widget.state.disqualified.contains(widget.playerId) ? Colors.red.shade900 : Colors.black;
             text = "";
          }
          if (widget.state.mode == GameMode.tapWar) {
             text = "${widget.state.tapCounts[widget.playerId] ?? 0}";
          }
          textColor = Colors.black; 
          break;
        case GameStatus.result:
          if (widget.state.winner == widget.playerId) {
            backgroundColor = const Color(0xFF39FF14); // Neon Green
            final ms = widget.state.reactionTime?.inMilliseconds ?? 0;
            final seconds = (ms / 1000).toStringAsFixed(3);
            
            String title = (widget.state.playerCount == 1) ? "SCORE" : "WINNER!";
            if (widget.state.isNewHighScore) title = "NEW BEST";
            
            text = "$title\n${seconds}s";
            if (widget.state.mode == GameMode.tapWar) {
               title = (widget.state.playerCount == 1) ? "SCORE" : "WINNER!";
               if (widget.state.isNewHighScore) title = "NEW BEST";
               text = "$title\n${widget.state.tapCounts[widget.playerId] ?? 0}";
            }
            textColor = Colors.black; 
          } else {
            backgroundColor = Colors.grey.shade900;
            text = "LOSE";
             if (widget.state.mode == GameMode.tapWar) {
               text = "LOSE\n${widget.state.tapCounts[widget.playerId] ?? 0}";
            }
          }
          break;
        case GameStatus.matchOver:
           backgroundColor = Colors.grey.shade900;
           text = (widget.state.winner == widget.playerId) ? "WINNER!" : "GAME\nOVER";
           if (widget.state.mode == GameMode.tapWar) {
              text = (widget.state.winner == widget.playerId) ? "WINNER!\n${widget.state.tapCounts[widget.playerId] ?? 0}" : "LOSE\n${widget.state.tapCounts[widget.playerId] ?? 0}";
           }
           textColor = (widget.state.winner == widget.playerId) ? const Color(0xFF39FF14) : Colors.red;
           break;
      }
    }

    // Special Action UI for Precision/Brain
    Widget content;
    
    // ALLOW entry if Brain Mode even if disqualified (to show wrong answer)
    bool showBrain = widget.state.mode == GameMode.brain && widget.state.status == GameStatus.action;
    
    if ((widget.state.status == GameStatus.action && !widget.state.disqualified.contains(widget.playerId)) || showBrain) {
       if (widget.state.mode == GameMode.precision) {
          content = Stack(
             fit: StackFit.expand,
             children: [
                // Background Tap -> Miss
                GestureDetector(
                   onTap: () {
                      // No Sound on Miss (per request)
                      widget.notifier.handlePrecisionMiss(widget.playerId);
                   },
                   child: Container(color: Colors.black), // Black BG for contrast
                ),
                // Target
                if (widget.state.targetAlignments.containsKey(widget.playerId))
                   Align(
                      alignment: widget.state.targetAlignments[widget.playerId]!,
                      child: GestureDetector(
                         onTapDown: (_) {
                            // Sound moved here to ensure trigger
                            musicService.playSfx('pistol.mp3'); 
                            widget.notifier.handleInteraction(widget.playerId, isDown: true);
                         },
                         child: const PrecisionTarget(), 
                      ),
                      ),

             ],
          );

       } else if (widget.state.mode == GameMode.brain && widget.state.currentQuestion != null) {
          final q = widget.state.currentQuestion!;
          final bool isLeft = (widget.playerId + q.hashCode) % 2 == 0; 
          
          final int val1 = q.answer;        // Correct
          final int val2 = q.wrongAnswer;   // Wrong
          
          // Determine placement
          final leftVal = isLeft ? val1 : val2;
          final rightVal = isLeft ? val2 : val1;
          
          final bool isDisqualified = widget.state.disqualified.contains(widget.playerId);
          
          // Values to display
          // Logic: 
          // If NOT disqualified: Blue/Orange normal.
          // If disqualified: The WRONG option (val2) turns RED. The Correct option (val1) stays or dims.
          
          Color getButtonColor(int value) {
             if (!isDisqualified) {
                // Determine original color based on position or random? Original code: Blue (Left), Orange (Right)
                // Left box gets Blue, Right box gets Orange.
                return (value == leftVal) ? Colors.blueAccent : Colors.orangeAccent;
             } else {
                // If this is the WRONG value, turn ERROR RED
                if (value == q.wrongAnswer) return Colors.red;
                // If correct value, dim it?
                return Colors.grey.shade800;
             }
          }
          
          String getButtonText(int value) {
              if (isDisqualified && value == q.wrongAnswer) return "WRONG"; 
              return "$value";
          }

          content = Padding(
             padding: const EdgeInsets.all(16),
             child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                   if (widget.state.playerCount == 1) const SizedBox(height: 100), // Fix for Dynamic Island (Increased)
                   Text(q.question, style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white)),
                   const SizedBox(height: 20),
                   Expanded(
                      child: Row(
                         crossAxisAlignment: CrossAxisAlignment.stretch,
                         children: [
                            Expanded(
                               child: GestureDetector(
                                  onTap: () {
                                     if (!isDisqualified) {
                                       musicService.playSfx('tap.mp3');
                                       widget.notifier.handleBrainChoice(widget.playerId, leftVal);
                                     }
                                  },
                                  child: Container(
                                     margin: const EdgeInsets.all(4),
                                     decoration: BoxDecoration(
                                        color: getButtonColor(leftVal),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.white30),
                                     ),
                                     child: Center(child: Text(getButtonText(leftVal), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white))),
                                  ),
                               ),
                            ),
                            Expanded(
                               child: GestureDetector(
                                  onTap: () {
                                     if (!isDisqualified) {
                                       musicService.playSfx('tap.mp3');
                                       widget.notifier.handleBrainChoice(widget.playerId, rightVal);
                                     }
                                  },
                                  child: Container(
                                     margin: const EdgeInsets.all(4),
                                     decoration: BoxDecoration(
                                        color: getButtonColor(rightVal),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.white30),
                                     ),
                                     child: Center(child: Text(getButtonText(rightVal), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white))),
                                  ),
                               ),
                            ),
                         ],
                      ),
                   ),
                ],
             ),
          );
       } else if (widget.state.mode == GameMode.cypher) {
           content = _buildCypherMode(textColor, backgroundColor, widget.quarterTurns);
       } else {
          // Classic Tap / Default Action
          // Tap War: If Action, show Count centrally
          Widget innerWidget;
          
          if (widget.state.mode == GameMode.tapWar && widget.state.status == GameStatus.action) {
             final count = widget.state.tapCounts[widget.playerId] ?? 0;
             innerWidget = Text("$count", style: TextStyle(color: textColor, fontSize: 80, fontWeight: FontWeight.w900));
          } else {
             // "TAP!" or similar
             innerWidget = Text(text, textAlign: TextAlign.center, style: TextStyle(color: textColor, fontSize: 32, fontWeight: FontWeight.w900));
          }
           
           content = RepaintBoundary(
              child: Container(
                color: backgroundColor,
                child: Center(child: innerWidget),
              ),
           );
       }
    } else {
       // Normal State (Non-Action or Disqualified)
       Widget innerWidget;

       // 1. Determine Inner Widget based on Text/Status
       if (widget.state.mode == GameMode.tapWar && widget.state.status == GameStatus.action) {
          final count = widget.state.tapCounts[widget.playerId] ?? 0;
          innerWidget = Text("$count", style: TextStyle(color: textColor, fontSize: 80, fontWeight: FontWeight.w900));
       } else if (text == "TAP TO START" || text == "TAP TO READY") {
          innerWidget = _PulsingText(text: text, style: TextStyle(color: textColor, fontSize: 32, fontWeight: FontWeight.w900));
       } else if (widget.state.status == GameStatus.countdown) {
          innerWidget = Text(text, style: TextStyle(color: textColor, fontSize: 150, fontWeight: FontWeight.w900));
       } else if (text == "WAIT" || text == "LISTEN") {
          innerWidget = _AnimatedEllipsisText(text: text, style: TextStyle(color: textColor, fontSize: 32, fontWeight: FontWeight.w900));
       } else {
           // Default Text
           String finalTxt = text;
           if (widget.state.status == GameStatus.result && widget.state.isNewHighScore && widget.state.winner == widget.playerId && widget.state.mode == GameMode.brain) {
               finalTxt = finalTxt.replaceAll("SCORE", "NEW BEST");
           }
           innerWidget = Text(finalTxt, textAlign: TextAlign.center, style: TextStyle(color: textColor, fontSize: 32, fontWeight: FontWeight.w900));
       }

       content = Container(
          color: backgroundColor,
          child: Center(
             child: ScaleTransition(
                scale: (widget.state.playerCount == 1 && text == "TAP TO START") 
                    ? _scaleAnimation 
                    : const AlwaysStoppedAnimation(1.0),
                child: innerWidget
             ),
          ),
       );
    }

    return Expanded(
      child: ShakeWidget(
           controller: _shakeController,
           deltaX: 15,
           deltaY: 15,
           duration: const Duration(milliseconds: 600),
           child: Listener(
        behavior: HitTestBehavior.opaque,
        onPointerDown: (widget.state.mode == GameMode.precision && widget.state.status == GameStatus.action) || 
                       (widget.state.mode == GameMode.brain && widget.state.status == GameStatus.action)
            ? null // handled internally above
            : (event) {
                  // Scale Effect for Single Player IDLE
                  if (widget.state.playerCount == 1 && widget.state.status == GameStatus.idle) {
                     _triggerBounce();
                  }

                 // Haptic Feedback Logic
                 if (widget.state.mode == GameMode.tapWar) {
                    HapticFeedback.heavyImpact(); // Keep strong haptics
                 } else {
                    HapticFeedback.selectionClick(); 
                 }

                 if (widget.state.mode == GameMode.precision) {
                     // Handled Internally
                 } else if (widget.state.mode == GameMode.tapWar) {
                     // NO SOUND for Tap War Gameplay (User Request)
                     if (widget.state.status == GameStatus.idle) {
                        musicService.playSfx('tap.mp3'); // Only for Ready
                     }
                 } else {
                    musicService.playSfx('tap.mp3'); 
                 }
                 if (widget.state.status == GameStatus.idle) {
                   widget.notifier.toggleReady(widget.playerId);
                 } else {
                   widget.notifier.handleInteraction(widget.playerId, isDown: true);
                 }
               },
        onPointerUp: (widget.state.mode == GameMode.precision && widget.state.status == GameStatus.action) ||
                     (widget.state.mode == GameMode.brain && widget.state.status == GameStatus.action)
            ? null
            : (_) {
                widget.notifier.handleInteraction(widget.playerId, isDown: false);
              },
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(
              color: (widget.state.playerCount > 1) ? Colors.white30 : Colors.black, 
              width: 4
            ),
          ),
          child: Stack(
            children: [
               // Main Content
               RotatedBox(
                  quarterTurns: widget.quarterTurns,
                   child: content,
                ),

                // Score Display (Minimalist & Compact)
                if (widget.state.playerCount > 1 && widget.state.mode != GameMode.tapWar)
                  Positioned(
                    top: (widget.quarterTurns == 2) ? 70 : null,
                    bottom: (widget.quarterTurns != 2) ? 50 : null,
                    left: 0, 
                    right: 0,
                    child: Center(
                      child: RotatedBox(
                        quarterTurns: widget.quarterTurns,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1), // Glass effect
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white24, width: 1),
                            boxShadow: [
                               BoxShadow(color: Colors.black12, blurRadius: 4, spreadRadius: 1),
                            ],
                          ),
                          child: Text(
                            "${widget.state.scores[widget.playerId] ?? 0}",
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 22,
                              shadows: [Shadow(color: Colors.black45, blurRadius: 4, offset: Offset(0, 2))],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
               
               // Player Label (On Top)
               if (widget.state.playerCount > 1) 
                 Positioned(
                   right: 16,
                   bottom: 16,
                   child: RotatedBox(
                     quarterTurns: widget.quarterTurns,
                     child: Text(
                       "P${widget.playerId}",
                       style: TextStyle(
                         color: Colors.white.withOpacity(widget.state.mode == GameMode.brain ? 0.2 : 0.5),
                         fontSize: widget.state.mode == GameMode.brain ? 24 : 48,
                         fontWeight: FontWeight.w900,
                       ),
                     ),
                   ),
                 ),
            ],
          ),
        ),
      ),
     ), // Close ShakeWidget
    );
  }

  Widget _buildTextContent(String text, Color textColor, int playerId, int quarterTurns) {
      return Column(
         mainAxisAlignment: MainAxisAlignment.center,
         children: [
             if (widget.state.playerCount == 1 && widget.state.highScoreMs != null && widget.state.status == GameStatus.idle)
             Padding(
               padding: const EdgeInsets.only(bottom: 20),
               child: Text(
                 "BEST: ${(widget.state.highScoreMs! / 1000).toStringAsFixed(3)}s",
                 style: TextStyle(color: Colors.white70, fontSize: 20, fontWeight: FontWeight.bold),
               ),
             ),
             
             Text(text, 
               textAlign: TextAlign.center, 
               style: TextStyle(color: textColor, fontSize: 32, fontWeight: FontWeight.w900)
             ),
         ],
      );
  }

  Widget _buildCypherMode(Color textColor, Color backgroundColor, int quarterTurns) {
    // Cypher: Slot Machine UI
    return Container(
      color: Colors.black, // Cyber Background
      width: double.infinity,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // TARGET WORD DISPLAY
          Padding(
            padding: const EdgeInsets.only(bottom: 30),
            child: Row(
               mainAxisAlignment: MainAxisAlignment.center,
               children: List.generate(widget.state.cypherTargetWord.length, (index) {
                  final letter = widget.state.cypherTargetWord[index];
                  final isFound = index < widget.state.cypherIndex;
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Text(
                      letter,
                      style: TextStyle(
                        color: isFound ? const Color(0xFF39FF14) : Colors.white24,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        shadows: isFound ? [const Shadow(color: Color(0xFF39FF14), blurRadius: 10)] : [],
                      ),
                    ),
                  );
               }),
            ),
          ), 
          
          // SLOTS ROW
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (index) {
               // Only show slots up to word length (usually 5)
               if (index >= widget.state.cypherTargetWord.length) return const SizedBox.shrink();
               
               final isLocked = index < widget.state.cypherIndex;
               final isActive = index == widget.state.cypherIndex;
               String displayChar = "?";
               Color boxColor = Colors.grey.shade900;
               Color charColor = Colors.white24;
               
               if (isLocked) {
                  displayChar = widget.state.cypherTargetWord[index];
                  boxColor = const Color(0xFF39FF14).withOpacity(0.2);
                  charColor = const Color(0xFF39FF14);
               } else if (isActive) {
                  displayChar = widget.state.cypherCurrentLetter; 
                  boxColor = Colors.amber.withOpacity(0.2);
                  charColor = Colors.white;
               } 
               
               return Container(
                 width: 50,
                 height: 70,
                 margin: const EdgeInsets.symmetric(horizontal: 4),
                 decoration: BoxDecoration(
                    color: boxColor,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                       color: isLocked ? const Color(0xFF39FF14) : (isActive ? Colors.amber : Colors.white12),
                       width: isActive ? 2 : 1,
                    ),
                    boxShadow: isActive ? [ BoxShadow(color: Colors.amber.withOpacity(0.4), blurRadius: 10) ] : [],
                 ),
                 child: Center(
                    child: Text(
                       displayChar,
                       style: TextStyle(
                          color: charColor,
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                       ),
                    ),
                 ),
               );
            }),
          ),
        ],
      ),
    );
  }
}

class _PulsingText extends StatefulWidget {
  final String text;
  final TextStyle style;

  const _PulsingText({required this.text, required this.style});

  @override
  State<_PulsingText> createState() => _PulsingTextState();
}

class _PulsingTextState extends State<_PulsingText> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
       vsync: this,
       duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
    
    _opacity = Tween<double>(begin: 0.3, end: 1.0).animate(
       CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _opacity,
      builder: (context, child) {
        return Opacity(
          opacity: _opacity.value,
          child: Text(
            widget.text,
            textAlign: TextAlign.center,
            style: widget.style,
          ),
        );
      },
    );
  }
}

class _AnimatedEllipsisText extends StatefulWidget {
  final String text; // "WAIT" or "LISTEN"
  final TextStyle style;

  const _AnimatedEllipsisText({required this.text, required this.style});

  @override
  State<_AnimatedEllipsisText> createState() => _AnimatedEllipsisTextState();
}

class _AnimatedEllipsisTextState extends State<_AnimatedEllipsisText> {
  int _dotCount = 0;
  late final SystemMouseCursor _cursor; // Just a placeholder for timer
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 500), (timer) {
      if (mounted) {
        setState(() {
          _dotCount = (_dotCount + 1) % 4; // 0, 1, 2, 3 loop
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    String dots = "";
    for (int i = 0; i < _dotCount; i++) {
        dots += ".";
    }
    
    // Use a Row with a fixed-width container for the dots to prevents the main text
    // from shifting (jittering) as the dots change.
    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(width: 45), // Balance the right side dots
        Text(
          widget.text,
          style: widget.style,
        ),
        SizedBox(
          width: 45, // Fixed width reserved for dots
          child: Text(
            dots,
            textAlign: TextAlign.left,
            style: widget.style,
          ),
        ),
      ],
    );
  }
}

class PrecisionTarget extends StatefulWidget {
  const PrecisionTarget({super.key});

  @override
  State<PrecisionTarget> createState() => _PrecisionTargetState();
}

class _PrecisionTargetState extends State<PrecisionTarget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 1))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
         return SizedBox(
           width: 80, height: 80,
           child: Stack(
             alignment: Alignment.center,
             children: [
               // Outer Ring (Rotating)
               Transform.rotate(
                 angle: _controller.value * 2 * pi,
                 child: Container(
                   width: 80, height: 80,
                   decoration: BoxDecoration(
                     shape: BoxShape.circle,
                     border: Border.all(color: const Color(0xFF00FFFF).withOpacity(0.5), width: 2), // Cyan
                   ),
                   child: Align(alignment: Alignment.topCenter, child: Container(width: 4, height: 10, color: const Color(0xFF00FFFF))),
                 ),
               ),
               // Inner Ring (Counter-Rotating)
               Transform.rotate(
                 angle: -_controller.value * 2 * pi,
                 child: Container(
                   width: 50, height: 50,
                   decoration: BoxDecoration(
                     shape: BoxShape.circle,
                     border: Border.all(color: const Color(0xFF39FF14), width: 3), // Neon Green
                   ),
                   child: Align(alignment: Alignment.bottomCenter, child: Container(width: 4, height: 8, color: const Color(0xFF39FF14))),
                 ),
               ),
               // Center Core (Pulsing)
               Container(
                 width: 20, height: 20,
                 decoration: BoxDecoration(
                   color: const Color(0xFFFF073A), // Neon Red
                   shape: BoxShape.circle,
                   boxShadow: [
                     BoxShadow(color: const Color(0xFFFF073A).withOpacity(0.8), blurRadius: 10 + (_controller.value * 5), spreadRadius: 2),
                   ],
                 ),
               ),
               // Crosshairs
               Container(width: 80, height: 1, color: Colors.white24),
               Container(width: 1, height: 80, color: Colors.white24),
             ],
           ),
         );
      },
    );
  }
}





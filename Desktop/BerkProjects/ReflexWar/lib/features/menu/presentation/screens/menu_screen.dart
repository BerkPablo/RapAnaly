import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:math';
import 'package:audioplayers/audioplayers.dart';
import '../../../game/presentation/screens/game_screen.dart';
import 'settings_screen.dart'; // Add Import
import '../../../game/presentation/providers/game_provider.dart';
import '../../../../core/services/music_service.dart'; // Added MusicService
import '../../../game/data/datasources/local_storage.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../services/ad_service.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> with TickerProviderStateMixin {
  late PageController _pageController;
  int _currentPage = 2; // Default to Classic (index 2)
  int _selectedPlayerCount = 2; // Default to 2P

  // Game Modes in Order
  final List<GameMode> _modes = [
    GameMode.tapWar,
    GameMode.brain,
    GameMode.classic,
    GameMode.fakeOut,
    GameMode.scoreboard,
    GameMode.precision,
    GameMode.cypher,
  ];

  // Animation Controllers
  late AnimationController _pulseController;
  late Animation<double> _titlePulse;
  late AnimationController _bgController;

  final AudioPlayer _uiPlayer = AudioPlayer();
  final List<Star> _stars = [];
  final Random _rng = Random();

  bool _isControllerInitialized = false;
  bool _isStartPressed = false;

  @override
  void initState() {
    super.initState();
    // _pageController initialized in didChangeDependencies for responsiveness

    // Title Pulse
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _titlePulse = Tween<double>(begin: 2, end: 10).animate(
      // Reduced blur for sharpness
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Background Animation
    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();

    // Generate Stars
    for (int i = 0; i < 60; i++) {
      _stars.add(Star(
        x: _rng.nextDouble(),
        y: _rng.nextDouble(),
        speed: 0.05 + _rng.nextDouble() * 0.15,
        size: 1.0 + _rng.nextDouble() * 2.0,
      ));
    }

    // Start Music
    musicService.init().then((_) => musicService.playMenuMusic());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isControllerInitialized) {
      final double screenWidth = MediaQuery.of(context).size.width;
      final bool isTablet = screenWidth >= 600;
      // On Tablet: Show more cards (smaller fraction). On Phone: Focus on one (larger fraction).
      // Adjusted per request to bring cards closer: Reduced fractions slightly.
      final double fraction = isTablet ? 0.35 : 0.6; 

      // Initial Page: 2 (Classic Mode is at index 2 now)
      _pageController =
          PageController(viewportFraction: fraction, initialPage: 2);
      _isControllerInitialized = true;

      // Also update initial currentPage state to match
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          setState(() {
            _currentPage = 2;
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _pulseController.dispose();
    _bgController.dispose();
    _uiPlayer.dispose();
    super.dispose();
  }

  Future<void> _playClick() async {
    SystemSound.play(SystemSoundType.click);
    /*
    try {
      await _uiPlayer.stop();
      await _uiPlayer.setSource(AssetSource('sounds/tick.mp3')); // Use tick for selection
      await _uiPlayer.setVolume(0.5); 
      await _uiPlayer.resume();
    } catch (e) {
      SystemSound.play(SystemSoundType.click);
    }
    */
  }

  Future<void> _playUiSound(String assetName, {double volume = 1.0}) async {
    try {
      await _uiPlayer.stop();
      await _uiPlayer.setVolume(volume);
      await _uiPlayer.play(AssetSource('sounds/$assetName'));
    } catch (_) {}
  }

  // _playStart removed in favor of direct musicService.playSfx

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Dynamic Background
          RepaintBoundary(
            child: AnimatedBuilder(
              animation: _bgController,
              builder: (context, child) {
                return CustomPaint(
                  painter: CyberBackgroundPainter(
                    progress: _bgController.value,
                    stars: _stars,
                  ),
                );
              },
            ),
          ),

          // 2. Main Layout
          SafeArea(
            child: Column(
              children: [
                const SizedBox(height: 20),
                // Title
                _buildGlitchTitle(),

                const Spacer(flex: 1),

                // Carousel
                SizedBox(
                  height: MediaQuery.of(context).size.shortestSide >= 600
                      ? 500
                      : 320, // Adaptive Height
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: _modes.length,
                    onPageChanged: (index) {
                      setState(() => _currentPage = index);
                      _playUiSound('swipe_sound.mp3',
                          volume: 1.0); // Max volume for swipe
                      HapticFeedback.selectionClick();
                    },
                    itemBuilder: (context, index) {
                      return AnimatedBuilder(
                        animation: _pageController,
                        builder: (context, child) {
                          double value = 1.0;
                          if (_pageController.position.haveDimensions) {
                            value = _pageController.page! - index;
                            value = (1 - (value.abs() * 0.3)).clamp(0.0, 1.0);
                          } else {
                            // Initial state
                            value = (index == _currentPage) ? 1.0 : 0.7;
                          }
                          return Center(
                            child: SizedBox(
                              height: Curves.easeOut.transform(value) *
                                  (MediaQuery.of(context).size.shortestSide >=
                                          600
                                      ? 500
                                      : 320),
                              width: Curves.easeOut.transform(value) *
                                  (MediaQuery.of(context).size.shortestSide >=
                                          600
                                      ? 400
                                      : 250),
                              child: child,
                            ),
                          );
                        },
                        child: _buildModeCard(
                            _modes[index], index == _currentPage),
                      );
                    },
                  ),
                ),

                const Spacer(flex: 1),

                // Player Count Selector
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Center(
                      child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 500),
                          child: _buildPlayerSelector())),
                ),

                const SizedBox(height: 30),

                // Start Button
                _buildStartButton(),

                const SizedBox(height: 20),

                // Ad Space Holder
                SizedBox(
                  height: 60,
                  child: adService.createBannerAdWidget(),
                ),
              ],
            ),
          ),

          // Settings Button (Top Right)
          Positioned(
             top: 50,
             right: 20,
             child: IconButton(
                icon: const Icon(Icons.settings, color: Colors.white70, size: 30),
                onPressed: () {
                   Navigator.push(context, MaterialPageRoute(builder: (context) => const SettingsScreen()));
                },
             ),
          ),
        ],
      ),
    );
  }

  Widget _buildGlitchTitle() {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        // Random Jitter for "Glitch" feel
        final offsetX = (_rng.nextDouble() - 0.5) *
            4.0 *
            (_pulseController.value > 0.8 ? 1 : 0);
        final offsetY = (_rng.nextDouble() - 0.5) *
            4.0 *
            (_pulseController.value > 0.8 ? 1 : 0);

        return Transform.translate(
          offset: Offset(offsetX, offsetY),
          child: ShaderMask(
            shaderCallback: (bounds) {
              return LinearGradient(
                colors: const [
                  Color(0xFF00FFCC), // Cyan
                  Color(0xFFFF00FF), // Magenta
                  Color(0xFF00FFCC), // Cyan
                ],
                stops: [
                  0.0,
                  _pulseController.value, // Animated gradient
                  1.0,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ).createShader(bounds);
            },
            child: Column(
              children: [
                Text(
                  "REFLEX",
                  style: GoogleFonts.orbitron(
                      fontSize: 56, // Large
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      shadows: [
                        BoxShadow(
                            color: Colors.cyanAccent.withOpacity(0.8),
                            blurRadius: _titlePulse.value,
                            offset: const Offset(-2, 0)),
                        BoxShadow(
                            color: Colors.pinkAccent.withOpacity(0.8),
                            blurRadius: _titlePulse.value,
                            offset: const Offset(2, 0)),
                      ]),
                ),
                Text(
                  "WAR",
                  style: GoogleFonts.orbitron(
                      fontSize: 56,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      shadows: [
                        BoxShadow(
                            color: Colors.cyanAccent.withOpacity(0.8),
                            blurRadius: _titlePulse.value,
                            offset: const Offset(2, 0)),
                        BoxShadow(
                            color: Colors.pinkAccent.withOpacity(0.8),
                            blurRadius: _titlePulse.value,
                            offset: const Offset(-2, 0)),
                      ]),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildModeCard(GameMode mode, bool isSelected) {
    final String label = _getModeLabel(mode);
    final String desc = _getModeDescription(mode);
    final IconData icon = _getModeIcon(mode);
    final Color color = isSelected ? Colors.cyanAccent : Colors.grey;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 5, vertical: 20), // Closermargin
      decoration: BoxDecoration(
        color: const Color(0xFF101020),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: color.withOpacity(isSelected ? 1.0 : 0.3),
          width: isSelected ? 3 : 1,
        ),
        boxShadow: isSelected
            ? [
                BoxShadow(
                    color: Colors.cyanAccent.withOpacity(0.4),
                    blurRadius: 20,
                    spreadRadius: 2),
              ]
            : [],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icon
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withOpacity(0.1),
              boxShadow: isSelected
                  ? [
                      BoxShadow(color: color.withOpacity(0.3), blurRadius: 15),
                    ]
                  : [],
            ),
            child: Icon(icon, size: 60, color: color),
          ),
          const SizedBox(height: 20),
          Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.orbitron(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              desc,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey.shade400,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(height: 12),
          FutureBuilder<int?>(
            future: LocalStorage().getHighScore(mode, _selectedPlayerCount),
            builder: (context, snapshot) {
              if (!snapshot.hasData || snapshot.data == null)
                return const SizedBox.shrink();

              String scoreText;
              if (mode == GameMode.tapWar) {
                scoreText = "${snapshot.data} Taps";
              } else if (mode == GameMode.precision) {
                scoreText = "${snapshot.data}ms";
              } else {
                scoreText = "${snapshot.data}ms";
              }

              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border:
                      Border.all(color: Colors.amberAccent.withOpacity(0.3)),
                ),
                child: Text(
                  "BEST: $scoreText",
                  style: GoogleFonts.orbitron(
                    color: Colors.amberAccent,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPlayerSelector() {
    // Determine enabled counts
    final maxPlayers = 4;
    final minPlayers = (_modes[_currentPage] == GameMode.scoreboard) ? 2 : 1;
    final isCypher = _modes[_currentPage] == GameMode.cypher;

    // Auto-adjust if invalid
    if (_selectedPlayerCount < minPlayers) _selectedPlayerCount = minPlayers;
    
    // Cypher is SP Only, force 1
    if (isCypher) _selectedPlayerCount = 1;

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white24),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: List.generate(maxPlayers, (index) {
          final count = index + 1;
          final isSelected = count == _selectedPlayerCount;
          final isEnabled = count >= minPlayers && (!isCypher || count == 1);

          return Expanded(
            child: GestureDetector(
              onTap: isEnabled
                  ? () {
                      setState(() => _selectedPlayerCount = count);
                      _playUiSound('player_selection.mp3');
                    }
                  : null,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 2),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.cyanAccent.withOpacity(0.8)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Text(
                  "${count}P",
                  textAlign: TextAlign.center,
                  style: GoogleFonts.orbitron(
                    color: isEnabled
                        ? (isSelected ? Colors.black : Colors.white)
                        : Colors.white24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildStartButton() {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isStartPressed = true),
      onTapUp: (_) => setState(() => _isStartPressed = false),
      onTapCancel: () => setState(() => _isStartPressed = false),
      onTap: () {
        musicService.playSfx('start_button2.mp3', volume: 1.0);
        HapticFeedback.heavyImpact();
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => GameScreen(
              playerCount: _selectedPlayerCount,
              initialMode: _modes[_currentPage],
            ),
          ),
        );
      },
      child: AnimatedScale(
        scale: _isStartPressed ? 0.95 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 100),
          width: 220,
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: _isStartPressed
                  ? [Colors.cyan.shade700, Colors.blue.shade900]
                  : [Colors.cyanAccent, Colors.blueAccent],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                  color: Colors.cyanAccent
                      .withOpacity(_isStartPressed ? 0.8 : 0.5),
                  blurRadius: _isStartPressed ? 30 : 20,
                  spreadRadius: _isStartPressed ? 2 : 0,
                  offset: const Offset(0, 4)),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icon Removed per request
              // const Icon(Icons.play_arrow_rounded, color: Colors.black, size: 32),
              // const SizedBox(width: 8),
              Text(
                "START GAME",
                textAlign: TextAlign.center,
                style: GoogleFonts.orbitron(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: Colors.black, // Dark text on bright gradient
                  letterSpacing: 2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Helpers
  String _getModeLabel(GameMode mode) {
    switch (mode) {
      case GameMode.classic:
        return 'CLASSIC';
      case GameMode.fakeOut:
        return 'FAKE OUT';
      case GameMode.scoreboard:
        return 'FIRST TO 5';
      case GameMode.precision:
        return 'PRECISION';
      case GameMode.brain:
        return 'BRAIN WAR';
      case GameMode.tapWar:
        return 'TAP WAR';
      case GameMode.cypher:
        return 'CYPHER';
    }
  }

  String _getModeDescription(GameMode mode) {
    switch (mode) {
      case GameMode.classic:
        return 'Test your pure reaction speed.';
      case GameMode.fakeOut:
        return 'Beware of yellow fake signals!';
      case GameMode.scoreboard:
        return 'First player to reach 5 points wins.';
      case GameMode.precision:
        return 'Tap the target, not the background!';
      case GameMode.brain:
        return 'Solve math problems faster.';
      case GameMode.tapWar:
        return 'Tap as fast as you can in 10s!';
      case GameMode.cypher:
        return 'Stop the reels! Match the password.';
    }
  }

  IconData _getModeIcon(GameMode mode) {
    switch (mode) {
      case GameMode.classic:
        return Icons.flash_on;
      case GameMode.fakeOut:
        return Icons.warning_amber_rounded;
      case GameMode.scoreboard:
        return Icons.emoji_events;
      case GameMode.precision:
        return Icons.my_location;
      case GameMode.brain:
        return Icons.psychology;
      case GameMode.tapWar:
        return Icons.touch_app;
      case GameMode.cypher:
        return Icons.lock_open; // Or similar lock icon
    }
  }
}

// Background Painter
class Star {
  double x, y, speed, size;
  Star(
      {required this.x,
      required this.y,
      required this.speed,
      required this.size});
}

class CyberBackgroundPainter extends CustomPainter {
  final double progress;
  final List<Star> stars;

  CyberBackgroundPainter({required this.progress, required this.stars});

  @override
  void paint(Canvas canvas, Size size) {
    final Paint bgPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF050510), Color(0xFF100520)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final Paint starPaint = Paint()..color = Colors.white.withOpacity(0.6);
    final Paint jetPaint = Paint()
      ..color = Colors.cyanAccent.withOpacity(0.3)
      ..style = PaintingStyle.fill;

    // Draw Stars (moving down slowly)
    for (var star in stars) {
      double newY = (star.y + progress * star.speed) % 1.0;
      canvas.drawCircle(Offset(star.x * size.width, newY * size.height),
          star.size, starPaint);
    }

    // Draw "Jets" (Fast moving triangles)
    // Jet 1
    double jet1Y = (progress * 2.0) % 1.2 - 0.1;
    double jet1X = 0.2 * size.width;
    _drawJet(canvas, Offset(jet1X, jet1Y * size.height), 20, jetPaint);

    // Jet 2
    double jet2Y = (progress * 1.5 + 0.5) % 1.2 - 0.1;
    double jet2X = 0.8 * size.width;
    _drawJet(canvas, Offset(jet2X, jet2Y * size.height), 15, jetPaint);
  }

  void _drawJet(Canvas canvas, Offset center, double scale, Paint paint) {
    final path = Path();
    path.moveTo(center.dx, center.dy - scale); // Nose
    path.lineTo(center.dx - scale / 2, center.dy + scale);
    path.lineTo(center.dx, center.dy + scale * 0.7); // Tail notch
    path.lineTo(center.dx + scale / 2, center.dy + scale);
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CyberBackgroundPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

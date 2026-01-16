import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:math';
import '../../../menu/presentation/screens/menu_screen.dart';
import 'package:google_fonts/google_fonts.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Timer? _glitchTimer;
  Timer? _navTimer;
  
  // Glitch State
  double _offsetX = 0;
  double _offsetY = 0;
  Color _color1 = Colors.cyanAccent;
  Color _color2 = Colors.purpleAccent;
  bool _showGlitch = false;

  @override
  void initState() {
    super.initState();
    
    // Start Glitch Loop (Faster Shake)
    _glitchTimer = Timer.periodic(const Duration(milliseconds: 50), (timer) {
      if (mounted) {
        setState(() {
          // Continuous Shake
          _showGlitch = true;
          _offsetX = (Random().nextDouble() - 0.5) * 3.0; // Smaller offset (Shake)
          _offsetY = (Random().nextDouble() - 0.5) * 3.0;
          
          // Occasional Color Split
          if (Random().nextDouble() > 0.8) {
             _color1 = Random().nextBool() ? Colors.cyanAccent : Colors.white;
             _color2 = Random().nextBool() ? Colors.redAccent : Colors.purpleAccent;
          } else {
             _color1 = Colors.white;
             _color2 = Colors.white;
          }
        });
      }
    });

    // Navigate logic (Smoother transition)
    _navTimer = Timer(const Duration(milliseconds: 1700), () {
      if (mounted) {
        Navigator.of(context).pushReplacement(
           PageRouteBuilder(
            pageBuilder: (_, __, ___) => const MenuScreen(),
            transitionsBuilder: (_, animation, __, child) {
              const curve = Curves.easeInOut;
              var curvedAnimation = CurvedAnimation(parent: animation, curve: curve);
              return FadeTransition(opacity: curvedAnimation, child: child);
            },
            transitionDuration: const Duration(milliseconds: 1000), // Smoother fade
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _glitchTimer?.cancel();
    _navTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background
          Container(color: Colors.black),
          
          Center(
            child: Stack(
              children: [
                // Glitch Layer 1 - Cyan/Red split (Original)
                if (_showGlitch)
                  Transform.translate(
                    offset: Offset(_offsetX, _offsetY),
                    child: _buildText(Colors.cyanAccent),
                  ),
                
                // Glitch Layer 2 - Purple split (Original)
                if (_showGlitch)
                  Transform.translate(
                    offset: Offset(-_offsetX * 0.5, -_offsetY * 0.5),
                    child: Opacity(opacity: 0.7, child: _buildText(Colors.purpleAccent)),
                  ),
                  
                // Main Text (Original White)
                _buildText(Colors.white),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildText(Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "REFLEX\nWAR",
          textAlign: TextAlign.center,
          style: GoogleFonts.orbitron(
            fontSize: 48,
            fontWeight: FontWeight.w900,
            color: color,
            letterSpacing: 8,
            shadows: [
              BoxShadow(
                color: color.withOpacity(0.5),
                blurRadius: 20,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

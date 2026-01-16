import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'services/ad_service.dart';
import 'features/menu/presentation/screens/menu_screen.dart';
import 'features/splash/presentation/screens/splash_screen.dart'; // Added Import

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  adService.initialize();
  // Lock orientation to Portrait Up
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  
  runApp(const ProviderScope(child: ReflexWarApp()));
}

class ReflexWarApp extends StatelessWidget {
  const ReflexWarApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Reflex War',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark,
        ),
        textTheme: GoogleFonts.orbitronTextTheme(Theme.of(context).textTheme).apply(
          bodyColor: Colors.white,
          displayColor: Colors.white,
        ),
        useMaterial3: true,
      ),
      home: const SplashScreen(), // Changed to SplashScreen
    );
  }
}

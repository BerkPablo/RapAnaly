import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart'; // Ensure url_launcher is in pubspec
import '../../../../core/services/music_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late bool _isMuted;

  @override
  void initState() {
    super.initState();
    _isMuted = musicService.isMuted;
  }

  void _toggleMute(bool value) async {
    await musicService.toggleMute();
    setState(() {
      _isMuted = musicService.isMuted;
    });
  }

  Future<void> _sendFeedback() async {
    final Uri emailLaunchUri = Uri(
      scheme: 'mailto',
      path: 'support@reflexwar.com', // Placeholder
      query: 'subject=Reflex War Feedback',
    );
    if (!await launchUrl(emailLaunchUri)) {
      debugPrint('Could not launch feedback email');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text("SETTINGS", style: GoogleFonts.orbitron(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Mute Toggle
            Container(
              decoration: BoxDecoration(
                color: Colors.grey.shade900,
                border: Border.all(color: Colors.white24),
                borderRadius: BorderRadius.circular(12),
              ),
              child: SwitchListTile(
                title: Text("Mute Sounds", style: GoogleFonts.orbitron(color: Colors.white)),
                secondary: Icon(_isMuted ? Icons.volume_off : Icons.volume_up, color: Colors.white),
                value: _isMuted,
                activeColor: const Color(0xFF39FF14), // Neon Green
                onChanged: _toggleMute,
              ),
            ),
            const SizedBox(height: 16),
            // Feedback
            GestureDetector(
              onTap: _sendFeedback,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade900,
                  border: Border.all(color: Colors.white24),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.mail_outline, color: Colors.white),
                    const SizedBox(width: 16),
                    Text("Send Feedback", style: GoogleFonts.orbitron(color: Colors.white, fontSize: 16)),
                    const Spacer(),
                    const Icon(Icons.arrow_forward_ios, color: Colors.white54, size: 16),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

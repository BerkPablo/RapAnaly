import 'package:shared_preferences/shared_preferences.dart';
import 'package:reflex_war/features/game/presentation/providers/game_provider.dart'; // For GameMode enum

class LocalStorage {
  
  String _getKey(GameMode mode, int playerCount) {
    return 'hs_${mode.name}_${playerCount}p';
  }

  Future<void> saveHighScore({
    required GameMode mode, 
    required int playerCount, 
    required int score,
    bool lowerIsBetter = true,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _getKey(mode, playerCount);
    final current = prefs.getInt(key);

    if (current == null) {
      await prefs.setInt(key, score);
    } else {
      if (lowerIsBetter) {
        if (score < current) await prefs.setInt(key, score);
      } else {
        if (score > current) await prefs.setInt(key, score);
      }
    }
  }

  Future<int?> getHighScore(GameMode mode, int playerCount) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_getKey(mode, playerCount));
  }
}

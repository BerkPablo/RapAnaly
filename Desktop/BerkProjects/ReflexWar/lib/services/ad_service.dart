import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

// NUCLEAR BYPASS: TEMPORARY STUB AD SERVICE
// This replaces the real AdService to allow building without google_mobile_ads plugin.
// Reason: Persistent 'PhaseScriptExecution' build failure in Simulator.

class AdService {
  Future<void> initialize() async {
    debugPrint('AdService STUB: Initialize called. (Ads Disabled)');
  }

  void startPeriodicAds() {
    debugPrint('AdService STUB: startPeriodicAds called.');
  }

  void stopPeriodicAds() {
    debugPrint('AdService STUB: stopPeriodicAds called.');
  }

  void showInterstitialAd() {
    debugPrint('AdService STUB: showInterstitialAd called. (No Ad shown)');
  }

  Widget createBannerAdWidget() {
    debugPrint('AdService STUB: createBannerAdWidget called.');
    return const SizedBox.shrink();
  }
}

// Global instance
final adService = AdService();

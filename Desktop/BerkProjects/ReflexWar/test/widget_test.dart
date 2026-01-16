import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:reflex_war/main.dart';

void main() {
  testWidgets('App starts and shows Menu', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ProviderScope(child: ReflexWarApp()));
    
    // Verify that we are on the menu screen
    expect(find.text('REFLEX WAR'), findsOneWidget);
    expect(find.text('SELECT PLAYERS'), findsOneWidget);
  });
}


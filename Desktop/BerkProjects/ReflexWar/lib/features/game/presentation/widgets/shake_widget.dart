import 'dart:math';
import 'package:flutter/material.dart';

class ShakeController {
  _ShakeWidgetState? _state;

  void shake() {
    _state?.shake();
  }

  void _bind(_ShakeWidgetState state) {
    _state = state;
  }
  
  void dispose() {
    _state = null;
  }
}

class ShakeWidget extends StatefulWidget {
  final Widget child;
  final ShakeController controller;
  final Duration duration;
  final double deltaX;
  final double deltaY;
  final Curve curve;

  const ShakeWidget({
    Key? key,
    required this.child,
    required this.controller,
    this.duration = const Duration(milliseconds: 500),
    this.deltaX = 20,
    this.deltaY = 20,
    this.curve = Curves.bounceOut,
  }) : super(key: key);

  @override
  State<ShakeWidget> createState() => _ShakeWidgetState();
}

class _ShakeWidgetState extends State<ShakeWidget> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(vsync: this, duration: widget.duration);
    
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: widget.curve),
    );

    widget.controller._bind(this);
    
    _animationController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _animationController.reset();
      }
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    widget.controller.dispose();
    super.dispose();
  }

  void shake() {
    _animationController.forward(from: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        final double sineValue = sin(_animation.value * pi * 3); // 3 shakes
        return Transform.translate(
          offset: Offset(
            sineValue * widget.deltaX * (1 - _animation.value), 
            sineValue * widget.deltaY * (1 - _animation.value)
          ), // Fade out shake
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

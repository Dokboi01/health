import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';

class MiniTrendChart extends StatelessWidget {
  const MiniTrendChart({
    required this.points,
    required this.color,
    super.key,
  });

  final List<double> points;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 120,
      width: double.infinity,
      child: CustomPaint(
        painter: _MiniTrendChartPainter(points: points, color: color),
      ),
    );
  }
}

class _MiniTrendChartPainter extends CustomPainter {
  _MiniTrendChartPainter({
    required this.points,
    required this.color,
  });

  final List<double> points;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) {
      return;
    }

    final minPoint = points.reduce((a, b) => a < b ? a : b);
    final maxPoint = points.reduce((a, b) => a > b ? a : b);
    final range = (maxPoint - minPoint).abs() < 0.001 ? 1.0 : maxPoint - minPoint;

    final path = Path();

    for (var index = 0; index < points.length; index++) {
      final x = size.width * index / (points.length - 1);
      final y = size.height - ((points[index] - minPoint) / range * size.height);

      if (index == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    final fillPath = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    final fillPaint = Paint()
      ..shader = LinearGradient(
        colors: [
          color.withOpacity(0.28),
          color.withOpacity(0.02),
        ],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Offset.zero & size);

    final strokePaint = Paint()
      ..color = color
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final gridPaint = Paint()
      ..color = AppColors.border
      ..strokeWidth = 1;

    for (var i = 1; i <= 3; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, strokePaint);
  }

  @override
  bool shouldRepaint(covariant _MiniTrendChartPainter oldDelegate) {
    return oldDelegate.points != points || oldDelegate.color != color;
  }
}

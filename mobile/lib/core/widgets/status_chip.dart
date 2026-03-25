import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({
    required this.label,
    this.isPositive = true,
    super.key,
  });

  final String label;
  final bool isPositive;

  @override
  Widget build(BuildContext context) {
    final background = isPositive ? AppColors.accentGreenSoft : const Color(0xFFFFF1EC);
    final foreground = isPositive ? AppColors.success : AppColors.danger;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: foreground,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';

class DashboardScaffold extends StatelessWidget {
  const DashboardScaffold({
    required this.title,
    required this.subtitle,
    required this.metricCards,
    required this.sections,
    required this.onLogout,
    required this.accentColor,
    super.key,
  });

  final String title;
  final String subtitle;
  final List<Widget> metricCards;
  final List<Widget> sections;
  final VoidCallback onLogout;
  final Color accentColor;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(24, 18, 24, 96),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primaryBlueDark,
                      AppColors.primaryBlue,
                      accentColor,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Align(
                      alignment: Alignment.topRight,
                      child: IconButton.filledTonal(
                        onPressed: onLogout,
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withOpacity(0.18),
                          foregroundColor: Colors.white,
                        ),
                        icon: const Icon(Icons.logout_rounded),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      title,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: Colors.white.withOpacity(0.92),
                            height: 1.45,
                          ),
                    ),
                  ],
                ),
              ),
              Transform.translate(
                offset: const Offset(0, -58),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: [
                      Wrap(
                        spacing: 16,
                        runSpacing: 16,
                        children: metricCards
                            .map((card) => SizedBox(width: 260, child: card))
                            .toList(),
                      ),
                      const SizedBox(height: 20),
                      ...sections,
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

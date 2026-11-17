import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

class HelplineEndpoint {
  final String id;
  final String organizationName;
  final String departmentName;
  final String category;
  final String? primaryPhoneRaw;
  final String? callableUri;
  final String fallbackPhoneRaw;
  final String fallbackCallableUri;
  final String operatingHours;
  final String? webPortal;
  final String? smsUri;
  final String? whatsappUri;

  const HelplineEndpoint({
    required this.id,
    required this.organizationName,
    required this.departmentName,
    required this.category,
    this.primaryPhoneRaw,
    this.callableUri,
    required this.fallbackPhoneRaw,
    required this.fallbackCallableUri,
    required this.operatingHours,
    this.webPortal,
    this.smsUri,
    this.whatsappUri,
  });
}

class HelplineDialerService {
  static const MethodChannel _androidCallChannel =
      MethodChannel('in.gov.civichelpline/direct_call');

  /// Normalizes any Indian short-code, toll-free, or STD landline into a callable URI
  static String normalizeToCallableUri(String rawNumber) {
    final digits = rawNumber.replaceAll(RegExp(r'[^0-9+]'), '');
    if (digits.isEmpty) return 'tel:112';
    // Short-codes (112, 181, 1902, 1915, 1969, 14420) must be dialed without +91 prefix
    if (digits.length <= 5) {
      return 'tel:$digits';
    }
    if (digits.startsWith('1800')) {
      return 'tel:$digits';
    }
    if (digits.startsWith('+91')) {
      return 'tel:$digits';
    }
    return 'tel:+91${digits.replaceFirst(RegExp(r'^0+'), '')}';
  }

  /// Executes One-Tap Auto-Connect with Smart Failover to Secondary/Nodal Helpline
  static Future<void> initiateOneTapCall(
    BuildContext context,
    HelplineEndpoint endpoint, {
    bool forceFallback = false,
  }) async {
    final bool hasPrimary = !forceFallback &&
        endpoint.callableUri != null &&
        endpoint.callableUri!.isNotEmpty &&
        !(endpoint.primaryPhoneRaw?.contains('xxxx') ?? true);

    final String targetUriStr =
        hasPrimary ? endpoint.callableUri! : endpoint.fallbackCallableUri;
    final String rawDigits = targetUriStr.replaceFirst('tel:', '');

    try {
      if (Platform.isAndroid) {
        // Attempt direct Android ACTION_CALL if permission is granted, else ACTION_DIAL
        try {
          final bool? calledDirectly = await _androidCallChannel
              .invokeMethod<bool>('callNumber', {'number': rawDigits});
          if (calledDirectly == true) return;
        } catch (_) {
          // Fallback to ACTION_DIAL via url_launcher
        }
      }

      final Uri dialUri = Platform.isIOS
          ? Uri.parse('telprompt:$rawDigits')
          : Uri.parse('tel:$rawDigits');

      if (await canLaunchUrl(dialUri)) {
        await launchUrl(dialUri, mode: LaunchMode.externalApplication);
      } else if (hasPrimary) {
        // Automatic failover to Secondary / State Nodal Helpline
        await initiateOneTapCall(context, endpoint, forceFallback: true);
      }
    } catch (err) {
      if (hasPrimary && context.mounted) {
        await initiateOneTapCall(context, endpoint, forceFallback: true);
      }
    }
  }
}


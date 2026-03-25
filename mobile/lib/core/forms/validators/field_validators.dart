class FieldValidators {
  static String? requiredField(String? value, {String fieldName = 'This field'}) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required.';
    }

    return null;
  }

  static String? email(String? value) {
    final requiredError = requiredField(value, fieldName: 'Email');
    if (requiredError != null) {
      return requiredError;
    }

    final normalized = value!.trim();
    final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

    if (!emailRegex.hasMatch(normalized)) {
      return 'Enter a valid email address.';
    }

    return null;
  }

  static String? password(
    String? value, {
    int minLength = 8,
    bool requireUppercase = true,
    bool requireLowercase = true,
    bool requireNumber = true,
  }) {
    final requiredError = requiredField(value, fieldName: 'Password');
    if (requiredError != null) {
      return requiredError;
    }

    final password = value!.trim();

    if (password.length < minLength) {
      return 'Password must be at least $minLength characters.';
    }

    if (requireUppercase && !RegExp(r'[A-Z]').hasMatch(password)) {
      return 'Password must contain at least one uppercase letter.';
    }

    if (requireLowercase && !RegExp(r'[a-z]').hasMatch(password)) {
      return 'Password must contain at least one lowercase letter.';
    }

    if (requireNumber && !RegExp(r'[0-9]').hasMatch(password)) {
      return 'Password must contain at least one number.';
    }

    return null;
  }

  static String? phone(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }

    final normalized = value.trim();
    final phoneRegex = RegExp(r'^[0-9+\-\s()]{7,20}$');

    if (!phoneRegex.hasMatch(normalized)) {
      return 'Enter a valid phone number.';
    }

    return null;
  }

  static String? minLength(String? value, int length, {String fieldName = 'Field'}) {
    final requiredError = requiredField(value, fieldName: fieldName);
    if (requiredError != null) {
      return requiredError;
    }

    if (value!.trim().length < length) {
      return '$fieldName must be at least $length characters.';
    }

    return null;
  }
}


import 'package:flutter_test/flutter_test.dart';

import 'package:merry360x_flutter/src/app.dart';

void main() {
  testWidgets('app shell renders', (WidgetTester tester) async {
    await tester.pumpWidget(const Merry360xMobileApp());

    expect(find.text('Merry360x'), findsOneWidget);
  });
}

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_fr.dart';
import 'app_localizations_rw.dart';
import 'app_localizations_sw.dart';
import 'app_localizations_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('fr'),
    Locale('rw'),
    Locale('sw'),
    Locale('zh'),
  ];

  /// No description provided for @navExplore.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get navExplore;

  /// No description provided for @navWishlist.
  ///
  /// In en, this message translates to:
  /// **'Wish list'**
  String get navWishlist;

  /// No description provided for @navTripCart.
  ///
  /// In en, this message translates to:
  /// **'Trip cart'**
  String get navTripCart;

  /// No description provided for @navMessages.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get navMessages;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @continueButton.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueButton;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @apply.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get apply;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @clear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get clear;

  /// No description provided for @search.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get search;

  /// No description provided for @all.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get all;

  /// No description provided for @or.
  ///
  /// In en, this message translates to:
  /// **'or'**
  String get or;

  /// No description provided for @total.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get total;

  /// No description provided for @viewAll.
  ///
  /// In en, this message translates to:
  /// **'View all'**
  String get viewAll;

  /// No description provided for @searchDestinations.
  ///
  /// In en, this message translates to:
  /// **'Search destinations'**
  String get searchDestinations;

  /// No description provided for @addDatesGuestHint.
  ///
  /// In en, this message translates to:
  /// **'Add dates · 1 guest'**
  String get addDatesGuestHint;

  /// No description provided for @searchStaysToursTransport.
  ///
  /// In en, this message translates to:
  /// **'Search stays, tours, transport'**
  String get searchStaysToursTransport;

  /// No description provided for @anywhereAnyWeek.
  ///
  /// In en, this message translates to:
  /// **'Anywhere · Any week · Add guests'**
  String get anywhereAnyWeek;

  /// No description provided for @signInForNotifications.
  ///
  /// In en, this message translates to:
  /// **'Sign in to view notifications'**
  String get signInForNotifications;

  /// No description provided for @signInToRefer.
  ///
  /// In en, this message translates to:
  /// **'Sign in to refer an operator'**
  String get signInToRefer;

  /// No description provided for @findYourPerfectStay.
  ///
  /// In en, this message translates to:
  /// **'Find Your Perfect Stay'**
  String get findYourPerfectStay;

  /// No description provided for @staysToursTransportEvents.
  ///
  /// In en, this message translates to:
  /// **'Stays · Tours · Transport · Events'**
  String get staysToursTransportEvents;

  /// No description provided for @referOperatorEarn.
  ///
  /// In en, this message translates to:
  /// **'Refer an Operator & Earn 10%'**
  String get referOperatorEarn;

  /// No description provided for @yourStoryLabel.
  ///
  /// In en, this message translates to:
  /// **'Your story'**
  String get yourStoryLabel;

  /// No description provided for @heroTitle.
  ///
  /// In en, this message translates to:
  /// **'Find A Property'**
  String get heroTitle;

  /// No description provided for @toursExperiences.
  ///
  /// In en, this message translates to:
  /// **'Tours & experiences'**
  String get toursExperiences;

  /// No description provided for @transport.
  ///
  /// In en, this message translates to:
  /// **'Transport'**
  String get transport;

  /// No description provided for @noStaysAvailable.
  ///
  /// In en, this message translates to:
  /// **'No stays available yet'**
  String get noStaysAvailable;

  /// No description provided for @noListingsYet.
  ///
  /// In en, this message translates to:
  /// **'No listings yet'**
  String get noListingsYet;

  /// No description provided for @tourLabel.
  ///
  /// In en, this message translates to:
  /// **'Tour'**
  String get tourLabel;

  /// No description provided for @tourPackageLabel.
  ///
  /// In en, this message translates to:
  /// **'Tour package'**
  String get tourPackageLabel;

  /// No description provided for @stayLabel.
  ///
  /// In en, this message translates to:
  /// **'Stay'**
  String get stayLabel;

  /// No description provided for @payWithMobileMoney.
  ///
  /// In en, this message translates to:
  /// **'Pay with Mobile Money'**
  String get payWithMobileMoney;

  /// No description provided for @momoPromoDesc.
  ///
  /// In en, this message translates to:
  /// **'Use MTN MoMo and other trusted wallets for a faster checkout experience.'**
  String get momoPromoDesc;

  /// No description provided for @mtnMomo.
  ///
  /// In en, this message translates to:
  /// **'MTN MoMo'**
  String get mtnMomo;

  /// No description provided for @airtelMoney.
  ///
  /// In en, this message translates to:
  /// **'Airtel Money'**
  String get airtelMoney;

  /// No description provided for @mpesa.
  ///
  /// In en, this message translates to:
  /// **'M-Pesa'**
  String get mpesa;

  /// No description provided for @promoCodeBanner.
  ///
  /// In en, this message translates to:
  /// **'SAVE10 on selected stays'**
  String get promoCodeBanner;

  /// No description provided for @promoCodeBannerDesc.
  ///
  /// In en, this message translates to:
  /// **'Apply at checkout for an instant 10% off your selected stay.'**
  String get promoCodeBannerDesc;

  /// No description provided for @copyCode.
  ///
  /// In en, this message translates to:
  /// **'Copy code'**
  String get copyCode;

  /// No description provided for @transportAndTransfers.
  ///
  /// In en, this message translates to:
  /// **'Transport & Transfers'**
  String get transportAndTransfers;

  /// No description provided for @searchVehicles.
  ///
  /// In en, this message translates to:
  /// **'Search vehicles…'**
  String get searchVehicles;

  /// No description provided for @noVehiclesFound.
  ///
  /// In en, this message translates to:
  /// **'No vehicles found'**
  String get noVehiclesFound;

  /// No description provided for @cars.
  ///
  /// In en, this message translates to:
  /// **'Cars'**
  String get cars;

  /// No description provided for @vansAndBuses.
  ///
  /// In en, this message translates to:
  /// **'Vans & Buses'**
  String get vansAndBuses;

  /// No description provided for @motorbikes.
  ///
  /// In en, this message translates to:
  /// **'Motorbikes'**
  String get motorbikes;

  /// No description provided for @boats.
  ///
  /// In en, this message translates to:
  /// **'Boats'**
  String get boats;

  /// No description provided for @toursAndExperiences.
  ///
  /// In en, this message translates to:
  /// **'Tours & Experiences'**
  String get toursAndExperiences;

  /// No description provided for @noToursAvailable.
  ///
  /// In en, this message translates to:
  /// **'No tours available'**
  String get noToursAvailable;

  /// No description provided for @nature.
  ///
  /// In en, this message translates to:
  /// **'Nature'**
  String get nature;

  /// No description provided for @adventure.
  ///
  /// In en, this message translates to:
  /// **'Adventure'**
  String get adventure;

  /// No description provided for @cultural.
  ///
  /// In en, this message translates to:
  /// **'Cultural'**
  String get cultural;

  /// No description provided for @wildlife.
  ///
  /// In en, this message translates to:
  /// **'Wildlife'**
  String get wildlife;

  /// No description provided for @historical.
  ///
  /// In en, this message translates to:
  /// **'Historical'**
  String get historical;

  /// No description provided for @myBookings.
  ///
  /// In en, this message translates to:
  /// **'My Bookings'**
  String get myBookings;

  /// No description provided for @postBookingCenter.
  ///
  /// In en, this message translates to:
  /// **'Post-booking center'**
  String get postBookingCenter;

  /// No description provided for @upcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get upcoming;

  /// No description provided for @past.
  ///
  /// In en, this message translates to:
  /// **'Past'**
  String get past;

  /// No description provided for @noUpcomingBookings.
  ///
  /// In en, this message translates to:
  /// **'No upcoming bookings'**
  String get noUpcomingBookings;

  /// No description provided for @noPastBookings.
  ///
  /// In en, this message translates to:
  /// **'No past bookings'**
  String get noPastBookings;

  /// No description provided for @writeReview.
  ///
  /// In en, this message translates to:
  /// **'Write Review'**
  String get writeReview;

  /// No description provided for @cancelBooking.
  ///
  /// In en, this message translates to:
  /// **'Cancel Booking'**
  String get cancelBooking;

  /// No description provided for @cancelBookingConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to cancel this booking? This action cannot be undone.'**
  String get cancelBookingConfirm;

  /// No description provided for @keepBooking.
  ///
  /// In en, this message translates to:
  /// **'Keep Booking'**
  String get keepBooking;

  /// No description provided for @writeAReview.
  ///
  /// In en, this message translates to:
  /// **'Write a Review'**
  String get writeAReview;

  /// No description provided for @accommodationRating.
  ///
  /// In en, this message translates to:
  /// **'Accommodation Rating'**
  String get accommodationRating;

  /// No description provided for @serviceRating.
  ///
  /// In en, this message translates to:
  /// **'Service Rating'**
  String get serviceRating;

  /// No description provided for @yourReview.
  ///
  /// In en, this message translates to:
  /// **'Your Review'**
  String get yourReview;

  /// No description provided for @shareYourExperience.
  ///
  /// In en, this message translates to:
  /// **'Share your experience…'**
  String get shareYourExperience;

  /// No description provided for @submitReview.
  ///
  /// In en, this message translates to:
  /// **'Submit Review'**
  String get submitReview;

  /// No description provided for @addComment.
  ///
  /// In en, this message translates to:
  /// **'Please add a comment'**
  String get addComment;

  /// No description provided for @reviewSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Review submitted. Thank you!'**
  String get reviewSubmitted;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @manageAccount.
  ///
  /// In en, this message translates to:
  /// **'Manage your account and preferences.'**
  String get manageAccount;

  /// No description provided for @signInToPersonalize.
  ///
  /// In en, this message translates to:
  /// **'Sign in to personalize your experience.'**
  String get signInToPersonalize;

  /// No description provided for @loginToPlan.
  ///
  /// In en, this message translates to:
  /// **'Log in to start planning your next trip.'**
  String get loginToPlan;

  /// No description provided for @merry360xMember.
  ///
  /// In en, this message translates to:
  /// **'Merry360x Member'**
  String get merry360xMember;

  /// No description provided for @addYourDetails.
  ///
  /// In en, this message translates to:
  /// **'Add your details'**
  String get addYourDetails;

  /// No description provided for @earnMore.
  ///
  /// In en, this message translates to:
  /// **'Earn more →'**
  String get earnMore;

  /// No description provided for @supportAndLegal.
  ///
  /// In en, this message translates to:
  /// **'Support & legal'**
  String get supportAndLegal;

  /// No description provided for @supportInbox.
  ///
  /// In en, this message translates to:
  /// **'Support inbox'**
  String get supportInbox;

  /// No description provided for @ticketsAndHelp.
  ///
  /// In en, this message translates to:
  /// **'Tickets, replies, and direct help'**
  String get ticketsAndHelp;

  /// No description provided for @privacyPolicy.
  ///
  /// In en, this message translates to:
  /// **'Privacy Policy'**
  String get privacyPolicy;

  /// No description provided for @howDataHandled.
  ///
  /// In en, this message translates to:
  /// **'How your data is handled'**
  String get howDataHandled;

  /// No description provided for @termsAndConditions.
  ///
  /// In en, this message translates to:
  /// **'Terms & Conditions'**
  String get termsAndConditions;

  /// No description provided for @rulesAndTerms.
  ///
  /// In en, this message translates to:
  /// **'Rules, bookings, and platform terms'**
  String get rulesAndTerms;

  /// No description provided for @appearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get appearance;

  /// No description provided for @lightMode.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get lightMode;

  /// No description provided for @darkMode.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get darkMode;

  /// No description provided for @systemMode.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get systemMode;

  /// No description provided for @lightModeDesc.
  ///
  /// In en, this message translates to:
  /// **'Light mode always on.'**
  String get lightModeDesc;

  /// No description provided for @darkModeDesc.
  ///
  /// In en, this message translates to:
  /// **'Dark mode always on.'**
  String get darkModeDesc;

  /// No description provided for @systemModeDesc.
  ///
  /// In en, this message translates to:
  /// **'Follows your device appearance.'**
  String get systemModeDesc;

  /// No description provided for @languageAndCurrency.
  ///
  /// In en, this message translates to:
  /// **'Language & Currency'**
  String get languageAndCurrency;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @currency.
  ///
  /// In en, this message translates to:
  /// **'Currency'**
  String get currency;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get signOut;

  /// No description provided for @deleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete Account'**
  String get deleteAccount;

  /// No description provided for @deleteAccountTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete account?'**
  String get deleteAccountTitle;

  /// No description provided for @deleteAccountBody.
  ///
  /// In en, this message translates to:
  /// **'This cannot be undone.'**
  String get deleteAccountBody;

  /// No description provided for @languageUpdated.
  ///
  /// In en, this message translates to:
  /// **'Language updated.'**
  String get languageUpdated;

  /// No description provided for @currencyUpdated.
  ///
  /// In en, this message translates to:
  /// **'Currency updated.'**
  String get currencyUpdated;

  /// No description provided for @accountDeleted.
  ///
  /// In en, this message translates to:
  /// **'Your account has been deleted.'**
  String get accountDeleted;

  /// No description provided for @accountDeleteFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not complete account deletion in-app.'**
  String get accountDeleteFailed;

  /// No description provided for @socialStories.
  ///
  /// In en, this message translates to:
  /// **'Social Stories'**
  String get socialStories;

  /// No description provided for @storiesDesc.
  ///
  /// In en, this message translates to:
  /// **'Share your moments and see how other travelers are experiencing their trips.'**
  String get storiesDesc;

  /// No description provided for @community.
  ///
  /// In en, this message translates to:
  /// **'Community'**
  String get community;

  /// No description provided for @quickAccess.
  ///
  /// In en, this message translates to:
  /// **'Quick Access'**
  String get quickAccess;

  /// No description provided for @manageQuickAccess.
  ///
  /// In en, this message translates to:
  /// **'Manage the parts of your account you use most.'**
  String get manageQuickAccess;

  /// No description provided for @manageReservations.
  ///
  /// In en, this message translates to:
  /// **'Manage reservations'**
  String get manageReservations;

  /// No description provided for @postBooking.
  ///
  /// In en, this message translates to:
  /// **'Post-Booking'**
  String get postBooking;

  /// No description provided for @postBookingDesc.
  ///
  /// In en, this message translates to:
  /// **'Charges, changes, disputes'**
  String get postBookingDesc;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @notificationsDesc.
  ///
  /// In en, this message translates to:
  /// **'Updates and alerts'**
  String get notificationsDesc;

  /// No description provided for @affiliatePortal.
  ///
  /// In en, this message translates to:
  /// **'Affiliate Portal'**
  String get affiliatePortal;

  /// No description provided for @affiliateDesc.
  ///
  /// In en, this message translates to:
  /// **'Partnership tools'**
  String get affiliateDesc;

  /// No description provided for @becomeHost.
  ///
  /// In en, this message translates to:
  /// **'Become a Host'**
  String get becomeHost;

  /// No description provided for @becomeHostDesc.
  ///
  /// In en, this message translates to:
  /// **'Start listing spaces'**
  String get becomeHostDesc;

  /// No description provided for @hostDashboard.
  ///
  /// In en, this message translates to:
  /// **'Host Dashboard'**
  String get hostDashboard;

  /// No description provided for @hostDashboardDesc.
  ///
  /// In en, this message translates to:
  /// **'Listings and income'**
  String get hostDashboardDesc;

  /// No description provided for @adminDashboard.
  ///
  /// In en, this message translates to:
  /// **'Admin Dashboard'**
  String get adminDashboard;

  /// No description provided for @adminDashboardDesc.
  ///
  /// In en, this message translates to:
  /// **'Platform controls'**
  String get adminDashboardDesc;

  /// No description provided for @operationsDashboard.
  ///
  /// In en, this message translates to:
  /// **'Operations Dashboard'**
  String get operationsDashboard;

  /// No description provided for @operationsDashboardDesc.
  ///
  /// In en, this message translates to:
  /// **'Approvals and publishing'**
  String get operationsDashboardDesc;

  /// No description provided for @financialDashboard.
  ///
  /// In en, this message translates to:
  /// **'Financial Dashboard'**
  String get financialDashboard;

  /// No description provided for @financialDashboardDesc.
  ///
  /// In en, this message translates to:
  /// **'Revenue and payouts'**
  String get financialDashboardDesc;

  /// No description provided for @supportDashboard.
  ///
  /// In en, this message translates to:
  /// **'Support Dashboard'**
  String get supportDashboard;

  /// No description provided for @supportDashboardDesc.
  ///
  /// In en, this message translates to:
  /// **'Tickets and users'**
  String get supportDashboardDesc;

  /// No description provided for @postBookingConsole.
  ///
  /// In en, this message translates to:
  /// **'Post-Booking Console'**
  String get postBookingConsole;

  /// No description provided for @postBookingConsoleDesc.
  ///
  /// In en, this message translates to:
  /// **'Admin charge and dispute queue'**
  String get postBookingConsoleDesc;

  /// No description provided for @welcomeToMerry.
  ///
  /// In en, this message translates to:
  /// **'Welcome to Merry360x'**
  String get welcomeToMerry;

  /// No description provided for @continueToAccount.
  ///
  /// In en, this message translates to:
  /// **'Continue to your account'**
  String get continueToAccount;

  /// No description provided for @createAccountToStart.
  ///
  /// In en, this message translates to:
  /// **'Create an account to get started'**
  String get createAccountToStart;

  /// No description provided for @whatsYourName.
  ///
  /// In en, this message translates to:
  /// **'What\'s your name?'**
  String get whatsYourName;

  /// No description provided for @youCanChangeLater.
  ///
  /// In en, this message translates to:
  /// **'You can always change this later.'**
  String get youCanChangeLater;

  /// No description provided for @fullName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get fullName;

  /// No description provided for @yourEmailAddress.
  ///
  /// In en, this message translates to:
  /// **'Your email address'**
  String get yourEmailAddress;

  /// No description provided for @verificationLinkHint.
  ///
  /// In en, this message translates to:
  /// **'We\'ll send a verification link here.'**
  String get verificationLinkHint;

  /// No description provided for @emailAddress.
  ///
  /// In en, this message translates to:
  /// **'Email address'**
  String get emailAddress;

  /// No description provided for @createPassword.
  ///
  /// In en, this message translates to:
  /// **'Create a password'**
  String get createPassword;

  /// No description provided for @passwordHint.
  ///
  /// In en, this message translates to:
  /// **'8+ chars · uppercase · lowercase · number · symbol'**
  String get passwordHint;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get createAccount;

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'← Back'**
  String get back;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get forgotPassword;

  /// No description provided for @newHereCreate.
  ///
  /// In en, this message translates to:
  /// **'New here? Create account'**
  String get newHereCreate;

  /// No description provided for @alreadyHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? Log in'**
  String get alreadyHaveAccount;

  /// No description provided for @googleSignIn.
  ///
  /// In en, this message translates to:
  /// **'Google'**
  String get googleSignIn;

  /// No description provided for @appleSignIn.
  ///
  /// In en, this message translates to:
  /// **'Apple'**
  String get appleSignIn;

  /// No description provided for @continueAsGuest.
  ///
  /// In en, this message translates to:
  /// **'Continue as guest'**
  String get continueAsGuest;

  /// No description provided for @resetPassword.
  ///
  /// In en, this message translates to:
  /// **'Reset Password'**
  String get resetPassword;

  /// No description provided for @resetPasswordDesc.
  ///
  /// In en, this message translates to:
  /// **'Enter your email and we\'ll send you a reset link.'**
  String get resetPasswordDesc;

  /// No description provided for @sendResetLink.
  ///
  /// In en, this message translates to:
  /// **'Send Reset Link'**
  String get sendResetLink;

  /// No description provided for @resetLinkSent.
  ///
  /// In en, this message translates to:
  /// **'Reset link sent! Check your email.'**
  String get resetLinkSent;

  /// No description provided for @accountCreatedCheckEmail.
  ///
  /// In en, this message translates to:
  /// **'Account created! Check your email to verify.'**
  String get accountCreatedCheckEmail;

  /// No description provided for @invalidEmail.
  ///
  /// In en, this message translates to:
  /// **'Please enter a valid email address.'**
  String get invalidEmail;

  /// No description provided for @passwordRequirements.
  ///
  /// In en, this message translates to:
  /// **'Use 8+ characters with uppercase, lowercase, a number, and a special character.'**
  String get passwordRequirements;

  /// No description provided for @enterEmailAndPassword.
  ///
  /// In en, this message translates to:
  /// **'Please enter email and password.'**
  String get enterEmailAndPassword;

  /// No description provided for @incorrectEmailOrPassword.
  ///
  /// In en, this message translates to:
  /// **'Incorrect email or password.'**
  String get incorrectEmailOrPassword;

  /// No description provided for @pleaseVerifyEmail.
  ///
  /// In en, this message translates to:
  /// **'Please verify your email first.'**
  String get pleaseVerifyEmail;

  /// No description provided for @accountAlreadyExists.
  ///
  /// In en, this message translates to:
  /// **'An account with this email already exists.'**
  String get accountAlreadyExists;

  /// No description provided for @signInCancelled.
  ///
  /// In en, this message translates to:
  /// **'Sign in was cancelled.'**
  String get signInCancelled;

  /// No description provided for @signUpsDisabled.
  ///
  /// In en, this message translates to:
  /// **'New sign-ups are temporarily disabled. Please try again later.'**
  String get signUpsDisabled;

  /// No description provided for @serverError.
  ///
  /// In en, this message translates to:
  /// **'A server error occurred. Please try again.'**
  String get serverError;

  /// No description provided for @passwordTooShort.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 8 characters.'**
  String get passwordTooShort;

  /// No description provided for @tooManyAttempts.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Please wait a moment and try again.'**
  String get tooManyAttempts;

  /// No description provided for @networkError.
  ///
  /// In en, this message translates to:
  /// **'Network error. Please check your connection.'**
  String get networkError;

  /// No description provided for @somethingWentWrong.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get somethingWentWrong;

  /// No description provided for @reviewBooking.
  ///
  /// In en, this message translates to:
  /// **'Review booking'**
  String get reviewBooking;

  /// No description provided for @payment.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get payment;

  /// No description provided for @bookingConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Booking confirmed'**
  String get bookingConfirmed;

  /// No description provided for @paymentInitiated.
  ///
  /// In en, this message translates to:
  /// **'Payment initiated'**
  String get paymentInitiated;

  /// No description provided for @bookingPending.
  ///
  /// In en, this message translates to:
  /// **'Booking pending'**
  String get bookingPending;

  /// No description provided for @details.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get details;

  /// No description provided for @instantConfirm.
  ///
  /// In en, this message translates to:
  /// **'Instant confirm'**
  String get instantConfirm;

  /// No description provided for @yourTrip.
  ///
  /// In en, this message translates to:
  /// **'Your trip'**
  String get yourTrip;

  /// No description provided for @checkIn.
  ///
  /// In en, this message translates to:
  /// **'Check-in'**
  String get checkIn;

  /// No description provided for @checkOut.
  ///
  /// In en, this message translates to:
  /// **'Check-out'**
  String get checkOut;

  /// No description provided for @guests.
  ///
  /// In en, this message translates to:
  /// **'Guests'**
  String get guests;

  /// No description provided for @priceBreakdown.
  ///
  /// In en, this message translates to:
  /// **'Price breakdown'**
  String get priceBreakdown;

  /// No description provided for @showPriceDetails.
  ///
  /// In en, this message translates to:
  /// **'Show price details'**
  String get showPriceDetails;

  /// No description provided for @hidePriceDetails.
  ///
  /// In en, this message translates to:
  /// **'Hide price details'**
  String get hidePriceDetails;

  /// No description provided for @promoCode.
  ///
  /// In en, this message translates to:
  /// **'Promo code'**
  String get promoCode;

  /// No description provided for @enterCode.
  ///
  /// In en, this message translates to:
  /// **'Enter code'**
  String get enterCode;

  /// No description provided for @guestDetails.
  ///
  /// In en, this message translates to:
  /// **'Guest details'**
  String get guestDetails;

  /// No description provided for @specialRequests.
  ///
  /// In en, this message translates to:
  /// **'Special requests (optional)'**
  String get specialRequests;

  /// No description provided for @continueToPay.
  ///
  /// In en, this message translates to:
  /// **'Continue to payment'**
  String get continueToPay;

  /// No description provided for @mobileMoney.
  ///
  /// In en, this message translates to:
  /// **'Mobile Money'**
  String get mobileMoney;

  /// No description provided for @card.
  ///
  /// In en, this message translates to:
  /// **'Card'**
  String get card;

  /// No description provided for @bankTransfer.
  ///
  /// In en, this message translates to:
  /// **'Bank Transfer'**
  String get bankTransfer;

  /// No description provided for @selectProvider.
  ///
  /// In en, this message translates to:
  /// **'Select provider'**
  String get selectProvider;

  /// No description provided for @momoNumber.
  ///
  /// In en, this message translates to:
  /// **'Mobile money number'**
  String get momoNumber;

  /// No description provided for @momoPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'7XX XXX XXX'**
  String get momoPlaceholder;

  /// No description provided for @momoPromptDesc.
  ///
  /// In en, this message translates to:
  /// **'You\'ll receive an SMS prompt to confirm payment on your mobile money account.'**
  String get momoPromptDesc;

  /// No description provided for @secure.
  ///
  /// In en, this message translates to:
  /// **'Secure'**
  String get secure;

  /// No description provided for @cardSecureDesc.
  ///
  /// In en, this message translates to:
  /// **'A secure Flutterwave payment sheet opens right here in the app. Enter your card details there — card only, no redirects.'**
  String get cardSecureDesc;

  /// No description provided for @cardSecureNote.
  ///
  /// In en, this message translates to:
  /// **'Your card details are entered on Flutterwave\'s secure page. We never store or see your card number.'**
  String get cardSecureNote;

  /// No description provided for @bankTransferDesc.
  ///
  /// In en, this message translates to:
  /// **'Bank transfer: we\'ll send you the bank details after you place the booking. Processing time is typically 1–2 business days after payment is received.'**
  String get bankTransferDesc;

  /// No description provided for @bankHoldNote.
  ///
  /// In en, this message translates to:
  /// **'Your booking will be held for 48 hours pending payment confirmation.'**
  String get bankHoldNote;

  /// No description provided for @momoNotAvailable.
  ///
  /// In en, this message translates to:
  /// **'Mobile money providers are not available for your detected region.'**
  String get momoNotAvailable;

  /// No description provided for @visa.
  ///
  /// In en, this message translates to:
  /// **'VISA'**
  String get visa;

  /// No description provided for @amex.
  ///
  /// In en, this message translates to:
  /// **'AMEX'**
  String get amex;

  /// No description provided for @payByCard.
  ///
  /// In en, this message translates to:
  /// **'Pay by card'**
  String get payByCard;

  /// No description provided for @confirmBooking.
  ///
  /// In en, this message translates to:
  /// **'Confirm booking'**
  String get confirmBooking;

  /// No description provided for @confirmAndPay.
  ///
  /// In en, this message translates to:
  /// **'Confirm & Pay'**
  String get confirmAndPay;

  /// No description provided for @completeCardPayment.
  ///
  /// In en, this message translates to:
  /// **'Complete your card payment in the browser.\nYour booking will be confirmed automatically.'**
  String get completeCardPayment;

  /// No description provided for @bankTransferPending.
  ///
  /// In en, this message translates to:
  /// **'Your booking is pending. Our team will\ncontact you to arrange bank transfer details.'**
  String get bankTransferPending;

  /// No description provided for @backToHome.
  ///
  /// In en, this message translates to:
  /// **'Back to home'**
  String get backToHome;

  /// No description provided for @viewMyBookings.
  ///
  /// In en, this message translates to:
  /// **'View my bookings'**
  String get viewMyBookings;

  /// No description provided for @selectMomoProvider.
  ///
  /// In en, this message translates to:
  /// **'Select a mobile money provider'**
  String get selectMomoProvider;

  /// No description provided for @enterMomoNumber.
  ///
  /// In en, this message translates to:
  /// **'Enter your mobile money number'**
  String get enterMomoNumber;

  /// No description provided for @enterFullName.
  ///
  /// In en, this message translates to:
  /// **'Enter your full name'**
  String get enterFullName;

  /// No description provided for @paymentFailed.
  ///
  /// In en, this message translates to:
  /// **'Payment failed or was declined. Please try again.'**
  String get paymentFailed;

  /// No description provided for @tripCart.
  ///
  /// In en, this message translates to:
  /// **'Trip cart'**
  String get tripCart;

  /// No description provided for @clearCart.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get clearCart;

  /// No description provided for @clearCartTitle.
  ///
  /// In en, this message translates to:
  /// **'Clear cart?'**
  String get clearCartTitle;

  /// No description provided for @clearCartBody.
  ///
  /// In en, this message translates to:
  /// **'Remove all items from your trip cart?'**
  String get clearCartBody;

  /// No description provided for @signInToViewCart.
  ///
  /// In en, this message translates to:
  /// **'Sign in to view your cart'**
  String get signInToViewCart;

  /// No description provided for @cartSyncDesc.
  ///
  /// In en, this message translates to:
  /// **'Your trip cart will sync with your account across all devices.'**
  String get cartSyncDesc;

  /// No description provided for @cartEmpty.
  ///
  /// In en, this message translates to:
  /// **'Your trip cart is empty'**
  String get cartEmpty;

  /// No description provided for @exploreToAdd.
  ///
  /// In en, this message translates to:
  /// **'Explore stays, tours, or transport and add them to your trip.'**
  String get exploreToAdd;

  /// No description provided for @proceedToCheckout.
  ///
  /// In en, this message translates to:
  /// **'Proceed to checkout'**
  String get proceedToCheckout;

  /// No description provided for @removedFromCart.
  ///
  /// In en, this message translates to:
  /// **'Removed from cart'**
  String get removedFromCart;

  /// No description provided for @couldNotRemoveItem.
  ///
  /// In en, this message translates to:
  /// **'Could not remove item. Pull to refresh and retry.'**
  String get couldNotRemoveItem;

  /// No description provided for @removed.
  ///
  /// In en, this message translates to:
  /// **'Removed'**
  String get removed;

  /// No description provided for @packageLabel.
  ///
  /// In en, this message translates to:
  /// **'Package'**
  String get packageLabel;

  /// No description provided for @estimatedTotal.
  ///
  /// In en, this message translates to:
  /// **'Estimated total'**
  String get estimatedTotal;

  /// No description provided for @base.
  ///
  /// In en, this message translates to:
  /// **'Base'**
  String get base;

  /// No description provided for @platformFees.
  ///
  /// In en, this message translates to:
  /// **'Platform fees'**
  String get platformFees;

  /// No description provided for @promoDiscount.
  ///
  /// In en, this message translates to:
  /// **'Promo discount'**
  String get promoDiscount;

  /// No description provided for @platformFeesNote.
  ///
  /// In en, this message translates to:
  /// **'Platform fees may apply'**
  String get platformFeesNote;

  /// No description provided for @wishlists.
  ///
  /// In en, this message translates to:
  /// **'Wishlists'**
  String get wishlists;

  /// No description provided for @connectAccount.
  ///
  /// In en, this message translates to:
  /// **'Connect your account'**
  String get connectAccount;

  /// No description provided for @signInToSync.
  ///
  /// In en, this message translates to:
  /// **'Sign in to sync your wishlists across devices.'**
  String get signInToSync;

  /// No description provided for @noWishlistItems.
  ///
  /// In en, this message translates to:
  /// **'No wishlist items yet.'**
  String get noWishlistItems;

  /// No description provided for @savePlacesHint.
  ///
  /// In en, this message translates to:
  /// **'Save places from Explore and they will appear here.'**
  String get savePlacesHint;

  /// No description provided for @removedFromWishlist.
  ///
  /// In en, this message translates to:
  /// **'Removed from wishlist.'**
  String get removedFromWishlist;

  /// No description provided for @unread.
  ///
  /// In en, this message translates to:
  /// **'unread'**
  String get unread;

  /// No description provided for @markAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get markAllRead;

  /// No description provided for @allCaughtUp.
  ///
  /// In en, this message translates to:
  /// **'All caught up!'**
  String get allCaughtUp;

  /// No description provided for @noNotifications.
  ///
  /// In en, this message translates to:
  /// **'No notifications yet'**
  String get noNotifications;

  /// No description provided for @messages.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get messages;

  /// No description provided for @refreshMessages.
  ///
  /// In en, this message translates to:
  /// **'Refresh messages'**
  String get refreshMessages;

  /// No description provided for @signInToMessage.
  ///
  /// In en, this message translates to:
  /// **'Sign in to message hosts and keep communication inside Merry360x for your safety.'**
  String get signInToMessage;

  /// No description provided for @safetyFirst.
  ///
  /// In en, this message translates to:
  /// **'Safety first'**
  String get safetyFirst;

  /// No description provided for @safetyDesc.
  ///
  /// In en, this message translates to:
  /// **'To protect you from scams, sharing phone numbers, addresses, links, and off-platform contacts is blocked in chat.'**
  String get safetyDesc;

  /// No description provided for @couldNotLoadConversations.
  ///
  /// In en, this message translates to:
  /// **'Could not load conversations'**
  String get couldNotLoadConversations;

  /// No description provided for @noConversationsYet.
  ///
  /// In en, this message translates to:
  /// **'No conversations yet'**
  String get noConversationsYet;

  /// No description provided for @openPropertyToMessage.
  ///
  /// In en, this message translates to:
  /// **'Open a property and tap Contact host to start messaging.'**
  String get openPropertyToMessage;

  /// No description provided for @connectYourAccount.
  ///
  /// In en, this message translates to:
  /// **'Connect your account'**
  String get connectYourAccount;

  /// No description provided for @typeYourMessage.
  ///
  /// In en, this message translates to:
  /// **'Type your message'**
  String get typeYourMessage;

  /// No description provided for @noMessageYet.
  ///
  /// In en, this message translates to:
  /// **'No message yet'**
  String get noMessageYet;

  /// No description provided for @couldNotLoadChat.
  ///
  /// In en, this message translates to:
  /// **'Could not load chat'**
  String get couldNotLoadChat;

  /// No description provided for @startTheConversation.
  ///
  /// In en, this message translates to:
  /// **'Start the conversation'**
  String get startTheConversation;

  /// No description provided for @accommodations.
  ///
  /// In en, this message translates to:
  /// **'Accommodations'**
  String get accommodations;

  /// No description provided for @tours.
  ///
  /// In en, this message translates to:
  /// **'Tours'**
  String get tours;

  /// No description provided for @when.
  ///
  /// In en, this message translates to:
  /// **'When'**
  String get when;

  /// No description provided for @who.
  ///
  /// In en, this message translates to:
  /// **'Who'**
  String get who;

  /// No description provided for @addDates.
  ///
  /// In en, this message translates to:
  /// **'Add dates'**
  String get addDates;

  /// No description provided for @oneGuest.
  ///
  /// In en, this message translates to:
  /// **'1 guest'**
  String get oneGuest;

  /// No description provided for @clearAll.
  ///
  /// In en, this message translates to:
  /// **'Clear all'**
  String get clearAll;

  /// No description provided for @findNearby.
  ///
  /// In en, this message translates to:
  /// **'Find what\'s nearby'**
  String get findNearby;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @adults.
  ///
  /// In en, this message translates to:
  /// **'Adults'**
  String get adults;

  /// No description provided for @agesAbove13.
  ///
  /// In en, this message translates to:
  /// **'Ages 13 or above'**
  String get agesAbove13;

  /// No description provided for @whereLabel.
  ///
  /// In en, this message translates to:
  /// **'Where'**
  String get whereLabel;

  /// No description provided for @whereQuestion.
  ///
  /// In en, this message translates to:
  /// **'Where?'**
  String get whereQuestion;

  /// No description provided for @suggestedDestinations.
  ///
  /// In en, this message translates to:
  /// **'Suggested destinations'**
  String get suggestedDestinations;

  /// No description provided for @useCurrentLocation.
  ///
  /// In en, this message translates to:
  /// **'Use your current location'**
  String get useCurrentLocation;

  /// No description provided for @suggestedDestination.
  ///
  /// In en, this message translates to:
  /// **'Suggested destination'**
  String get suggestedDestination;

  /// No description provided for @orSearchByName.
  ///
  /// In en, this message translates to:
  /// **'or search by name'**
  String get orSearchByName;

  /// No description provided for @searchByListingName.
  ///
  /// In en, this message translates to:
  /// **'Search by listing name…'**
  String get searchByListingName;

  /// No description provided for @searchByName.
  ///
  /// In en, this message translates to:
  /// **'Search by name'**
  String get searchByName;

  /// No description provided for @typePropertyOrTourName.
  ///
  /// In en, this message translates to:
  /// **'Type a property or tour name…'**
  String get typePropertyOrTourName;

  /// No description provided for @showAllResults.
  ///
  /// In en, this message translates to:
  /// **'Show all results'**
  String get showAllResults;

  /// No description provided for @guestsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} guests'**
  String guestsCount(int count);

  /// No description provided for @noListingsFoundFor.
  ///
  /// In en, this message translates to:
  /// **'No listings found for \"{query}\"'**
  String noListingsFoundFor(String query);

  /// No description provided for @showAllCountResults.
  ///
  /// In en, this message translates to:
  /// **'Show all {count} results →'**
  String showAllCountResults(int count);

  /// No description provided for @merryAI.
  ///
  /// In en, this message translates to:
  /// **'Merry'**
  String get merryAI;

  /// No description provided for @aiDesc.
  ///
  /// In en, this message translates to:
  /// **'AI concierge for stays, tours, transport, and checkout.'**
  String get aiDesc;

  /// No description provided for @aiConsentTitle.
  ///
  /// In en, this message translates to:
  /// **'AI Consent'**
  String get aiConsentTitle;

  /// No description provided for @aiConsentBody.
  ///
  /// In en, this message translates to:
  /// **'Your prompt will be sent to our AI provider to generate responses. Avoid sharing sensitive personal data.'**
  String get aiConsentBody;

  /// No description provided for @iAgree.
  ///
  /// In en, this message translates to:
  /// **'I Agree'**
  String get iAgree;

  /// No description provided for @aiConsentGranted.
  ///
  /// In en, this message translates to:
  /// **'AI consent granted.'**
  String get aiConsentGranted;

  /// No description provided for @aiConsentNotice.
  ///
  /// In en, this message translates to:
  /// **'Before first use, you will be asked to consent to AI processing.'**
  String get aiConsentNotice;

  /// No description provided for @askMerryPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Ask Merry anything...'**
  String get askMerryPlaceholder;

  /// No description provided for @askMerryHint.
  ///
  /// In en, this message translates to:
  /// **'Ask for a stay, a tour, airport pickup, your trip cart, or checkout help.'**
  String get askMerryHint;

  /// No description provided for @whatCanIHelp.
  ///
  /// In en, this message translates to:
  /// **'What can I help with?'**
  String get whatCanIHelp;

  /// No description provided for @startFastOptions.
  ///
  /// In en, this message translates to:
  /// **'Start fast with one of these options.'**
  String get startFastOptions;

  /// No description provided for @planATrip.
  ///
  /// In en, this message translates to:
  /// **'Plan a trip'**
  String get planATrip;

  /// No description provided for @planATripDesc.
  ///
  /// In en, this message translates to:
  /// **'Answer a few questions and get a trip plan'**
  String get planATripDesc;

  /// No description provided for @whatIsMerry.
  ///
  /// In en, this message translates to:
  /// **'What is Merry360X?'**
  String get whatIsMerry;

  /// No description provided for @whatIsMerryDesc.
  ///
  /// In en, this message translates to:
  /// **'Learn what Merry can help you book'**
  String get whatIsMerryDesc;

  /// No description provided for @findCheapest.
  ///
  /// In en, this message translates to:
  /// **'Find the cheapest'**
  String get findCheapest;

  /// No description provided for @findCheapestDesc.
  ///
  /// In en, this message translates to:
  /// **'Start with lower-budget options'**
  String get findCheapestDesc;

  /// No description provided for @askAboutMerry.
  ///
  /// In en, this message translates to:
  /// **'Ask about Merry360X'**
  String get askAboutMerry;

  /// No description provided for @askAboutMerryDesc.
  ///
  /// In en, this message translates to:
  /// **'Ask anything related to Merry360X freely'**
  String get askAboutMerryDesc;

  /// No description provided for @merryCapabilities.
  ///
  /// In en, this message translates to:
  /// **'Merry gives recommendations, opens native details, and can route you into trip cart, bookings, and checkout.'**
  String get merryCapabilities;

  /// No description provided for @whatWorkedWell.
  ///
  /// In en, this message translates to:
  /// **'What worked well?'**
  String get whatWorkedWell;

  /// No description provided for @whatWasMissing.
  ///
  /// In en, this message translates to:
  /// **'What was missing?'**
  String get whatWasMissing;

  /// No description provided for @optionalNote.
  ///
  /// In en, this message translates to:
  /// **'Optional note'**
  String get optionalNote;

  /// No description provided for @skipNote.
  ///
  /// In en, this message translates to:
  /// **'Skip note'**
  String get skipNote;

  /// No description provided for @sendFeedback.
  ///
  /// In en, this message translates to:
  /// **'Send feedback'**
  String get sendFeedback;

  /// No description provided for @openTripCartAction.
  ///
  /// In en, this message translates to:
  /// **'Open Trip Cart'**
  String get openTripCartAction;

  /// No description provided for @goToCheckout.
  ///
  /// In en, this message translates to:
  /// **'Go to Checkout'**
  String get goToCheckout;

  /// No description provided for @signInToSaveCart.
  ///
  /// In en, this message translates to:
  /// **'Sign in first to save items to your trip cart.'**
  String get signInToSaveCart;

  /// No description provided for @savedToCart.
  ///
  /// In en, this message translates to:
  /// **'Saved to your Trip Cart.'**
  String get savedToCart;

  /// No description provided for @savedToCartWithCheckout.
  ///
  /// In en, this message translates to:
  /// **'Saved to your Trip Cart. You can review it now or continue into checkout.'**
  String get savedToCartWithCheckout;

  /// No description provided for @addItemFirst.
  ///
  /// In en, this message translates to:
  /// **'Add an item to your trip cart before checkout.'**
  String get addItemFirst;

  /// No description provided for @couldNotSubmitRefund.
  ///
  /// In en, this message translates to:
  /// **'Could not submit the refund request right now.'**
  String get couldNotSubmitRefund;

  /// No description provided for @thanksFeedback.
  ///
  /// In en, this message translates to:
  /// **'Thanks for sharing AI feedback.'**
  String get thanksFeedback;

  /// No description provided for @couldNotSaveRating.
  ///
  /// In en, this message translates to:
  /// **'Could not save rating right now.'**
  String get couldNotSaveRating;

  /// No description provided for @aiNetworkError.
  ///
  /// In en, this message translates to:
  /// **'Network error. Please check your connection and try again.'**
  String get aiNetworkError;

  /// No description provided for @aiError.
  ///
  /// In en, this message translates to:
  /// **'Sorry, I could not process that request right now. Please try again.'**
  String get aiError;

  /// No description provided for @untitled.
  ///
  /// In en, this message translates to:
  /// **'Untitled'**
  String get untitled;

  /// No description provided for @actionLabel.
  ///
  /// In en, this message translates to:
  /// **'Action'**
  String get actionLabel;

  /// No description provided for @checkoutAction.
  ///
  /// In en, this message translates to:
  /// **'Checkout'**
  String get checkoutAction;

  /// No description provided for @addToCart.
  ///
  /// In en, this message translates to:
  /// **'Add to Cart'**
  String get addToCart;

  /// No description provided for @wasResponseHelpful.
  ///
  /// In en, this message translates to:
  /// **'Was this response helpful?'**
  String get wasResponseHelpful;

  /// No description provided for @feedbackPromptDesc.
  ///
  /// In en, this message translates to:
  /// **'Choose thumbs up or down, then add an optional note.'**
  String get feedbackPromptDesc;

  /// No description provided for @helpful.
  ///
  /// In en, this message translates to:
  /// **'Helpful'**
  String get helpful;

  /// No description provided for @needsWork.
  ///
  /// In en, this message translates to:
  /// **'Needs work'**
  String get needsWork;

  /// No description provided for @feedbackSavedUp.
  ///
  /// In en, this message translates to:
  /// **'Feedback saved: thumbs up'**
  String get feedbackSavedUp;

  /// No description provided for @feedbackSavedDown.
  ///
  /// In en, this message translates to:
  /// **'Feedback saved: thumbs down'**
  String get feedbackSavedDown;

  /// No description provided for @merryIsThinking.
  ///
  /// In en, this message translates to:
  /// **'Merry is thinking...'**
  String get merryIsThinking;

  /// No description provided for @priceOnRequest.
  ///
  /// In en, this message translates to:
  /// **'Price on request'**
  String get priceOnRequest;

  /// No description provided for @locationNotSpecified.
  ///
  /// In en, this message translates to:
  /// **'Location not specified'**
  String get locationNotSpecified;

  /// No description provided for @actionNotAvailableYet.
  ///
  /// In en, this message translates to:
  /// **'Action not available yet: {label}'**
  String actionNotAvailableYet(String label);

  /// No description provided for @reserve.
  ///
  /// In en, this message translates to:
  /// **'Reserve'**
  String get reserve;

  /// No description provided for @someDetailsUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Some details may be unavailable.'**
  String get someDetailsUnavailable;

  /// No description provided for @aboutThisPlace.
  ///
  /// In en, this message translates to:
  /// **'About this place'**
  String get aboutThisPlace;

  /// No description provided for @amenities.
  ///
  /// In en, this message translates to:
  /// **'Amenities'**
  String get amenities;

  /// No description provided for @connectWithHost.
  ///
  /// In en, this message translates to:
  /// **'Connect with host'**
  String get connectWithHost;

  /// No description provided for @recommendedForTrip.
  ///
  /// In en, this message translates to:
  /// **'Recommended for your trip'**
  String get recommendedForTrip;

  /// No description provided for @yourTripSection.
  ///
  /// In en, this message translates to:
  /// **'Your trip'**
  String get yourTripSection;

  /// No description provided for @dates.
  ///
  /// In en, this message translates to:
  /// **'Dates'**
  String get dates;

  /// No description provided for @addToTripCart.
  ///
  /// In en, this message translates to:
  /// **'Add to Trip Cart'**
  String get addToTripCart;

  /// No description provided for @message.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get message;

  /// No description provided for @properties.
  ///
  /// In en, this message translates to:
  /// **'Properties'**
  String get properties;

  /// No description provided for @tourPackages.
  ///
  /// In en, this message translates to:
  /// **'Tour packages'**
  String get tourPackages;

  /// No description provided for @support.
  ///
  /// In en, this message translates to:
  /// **'Support'**
  String get support;

  /// No description provided for @newTicket.
  ///
  /// In en, this message translates to:
  /// **'New Ticket'**
  String get newTicket;

  /// No description provided for @signInForTickets.
  ///
  /// In en, this message translates to:
  /// **'Sign in for tickets'**
  String get signInForTickets;

  /// No description provided for @signInForTicketsDesc.
  ///
  /// In en, this message translates to:
  /// **'Sign in to track tickets and continue support conversations from the app.'**
  String get signInForTicketsDesc;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @phone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get phone;

  /// No description provided for @couldNotLoadTickets.
  ///
  /// In en, this message translates to:
  /// **'Could not load support tickets'**
  String get couldNotLoadTickets;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get tryAgain;

  /// No description provided for @noSupportTickets.
  ///
  /// In en, this message translates to:
  /// **'No support tickets'**
  String get noSupportTickets;

  /// No description provided for @tapToCreateTicket.
  ///
  /// In en, this message translates to:
  /// **'Tap + New Ticket to contact us'**
  String get tapToCreateTicket;

  /// No description provided for @ticketSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Ticket submitted. Support will reply shortly.'**
  String get ticketSubmitted;

  /// No description provided for @contactSupport.
  ///
  /// In en, this message translates to:
  /// **'Contact Support'**
  String get contactSupport;

  /// No description provided for @contactSupportDesc.
  ///
  /// In en, this message translates to:
  /// **'Share a clear subject and details. We reply as quickly as possible.'**
  String get contactSupportDesc;

  /// No description provided for @subject.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get subject;

  /// No description provided for @subjectHint.
  ///
  /// In en, this message translates to:
  /// **'Example: Payment issue on booking'**
  String get subjectHint;

  /// No description provided for @describeIssue.
  ///
  /// In en, this message translates to:
  /// **'Describe your issue'**
  String get describeIssue;

  /// No description provided for @issueDesc.
  ///
  /// In en, this message translates to:
  /// **'What happened and what do you need help with?'**
  String get issueDesc;

  /// No description provided for @enterSubject.
  ///
  /// In en, this message translates to:
  /// **'Enter a subject'**
  String get enterSubject;

  /// No description provided for @subjectTooShort.
  ///
  /// In en, this message translates to:
  /// **'Use at least 3 characters'**
  String get subjectTooShort;

  /// No description provided for @describeTheIssue.
  ///
  /// In en, this message translates to:
  /// **'Describe the issue'**
  String get describeTheIssue;

  /// No description provided for @messageTooShort.
  ///
  /// In en, this message translates to:
  /// **'Use at least 8 characters'**
  String get messageTooShort;

  /// No description provided for @completeTicketForm.
  ///
  /// In en, this message translates to:
  /// **'Please complete subject and message'**
  String get completeTicketForm;

  /// No description provided for @supportReady.
  ///
  /// In en, this message translates to:
  /// **'Support is ready. Send a message to start the conversation.'**
  String get supportReady;

  /// No description provided for @typeAMessage.
  ///
  /// In en, this message translates to:
  /// **'Type a message…'**
  String get typeAMessage;

  /// No description provided for @typingStatus.
  ///
  /// In en, this message translates to:
  /// **'typing...'**
  String get typingStatus;

  /// No description provided for @onlineStatus.
  ///
  /// In en, this message translates to:
  /// **'online'**
  String get onlineStatus;

  /// No description provided for @offlineStatus.
  ///
  /// In en, this message translates to:
  /// **'offline'**
  String get offlineStatus;

  /// No description provided for @submitTicket.
  ///
  /// In en, this message translates to:
  /// **'Submit Ticket'**
  String get submitTicket;

  /// No description provided for @supportTicketFallback.
  ///
  /// In en, this message translates to:
  /// **'Support Ticket'**
  String get supportTicketFallback;

  /// No description provided for @nMessages.
  ///
  /// In en, this message translates to:
  /// **'{count} {count, plural, =1{message} other{messages}}'**
  String nMessages(int count);

  /// No description provided for @joinedConversation.
  ///
  /// In en, this message translates to:
  /// **'{name} joined the conversation'**
  String joinedConversation(String name);

  /// No description provided for @isTyping.
  ///
  /// In en, this message translates to:
  /// **'{name} is typing...'**
  String isTyping(String name);

  /// No description provided for @reviews.
  ///
  /// In en, this message translates to:
  /// **'reviews'**
  String get reviews;

  /// No description provided for @upToGuests.
  ///
  /// In en, this message translates to:
  /// **'Up to {count} guests'**
  String upToGuests(int count);

  /// No description provided for @nightSuffix.
  ///
  /// In en, this message translates to:
  /// **'/ night'**
  String get nightSuffix;

  /// No description provided for @daySuffix.
  ///
  /// In en, this message translates to:
  /// **'/ day'**
  String get daySuffix;

  /// No description provided for @personSuffix.
  ///
  /// In en, this message translates to:
  /// **'/ person'**
  String get personSuffix;

  /// No description provided for @showMore.
  ///
  /// In en, this message translates to:
  /// **'Show more'**
  String get showMore;

  /// No description provided for @showLess.
  ///
  /// In en, this message translates to:
  /// **'Show less'**
  String get showLess;

  /// No description provided for @selectDates.
  ///
  /// In en, this message translates to:
  /// **'Select dates'**
  String get selectDates;

  /// No description provided for @datesLabel.
  ///
  /// In en, this message translates to:
  /// **'Dates'**
  String get datesLabel;

  /// No description provided for @guestsLabel.
  ///
  /// In en, this message translates to:
  /// **'Guests'**
  String get guestsLabel;

  /// No description provided for @nGuestsLabel.
  ///
  /// In en, this message translates to:
  /// **'{count} {count, plural, =1{guest} other{guests}}'**
  String nGuestsLabel(int count);

  /// No description provided for @signInToBook.
  ///
  /// In en, this message translates to:
  /// **'Sign in to book'**
  String get signInToBook;

  /// No description provided for @signInToSaveToTripCart.
  ///
  /// In en, this message translates to:
  /// **'Sign in to save to trip cart'**
  String get signInToSaveToTripCart;

  /// No description provided for @addedToTripCart.
  ///
  /// In en, this message translates to:
  /// **'Added to trip cart ✓'**
  String get addedToTripCart;

  /// No description provided for @couldNotAddToCart.
  ///
  /// In en, this message translates to:
  /// **'Could not add to cart'**
  String get couldNotAddToCart;

  /// No description provided for @savedToWishlist.
  ///
  /// In en, this message translates to:
  /// **'Saved to wishlist'**
  String get savedToWishlist;

  /// No description provided for @removedFromWishlistAction.
  ///
  /// In en, this message translates to:
  /// **'Removed from wishlist'**
  String get removedFromWishlistAction;

  /// No description provided for @signInToSaveToWishlist.
  ///
  /// In en, this message translates to:
  /// **'Sign in to save to wishlist'**
  String get signInToSaveToWishlist;

  /// No description provided for @couldNotUpdateWishlist.
  ///
  /// In en, this message translates to:
  /// **'Could not update wishlist'**
  String get couldNotUpdateWishlist;

  /// No description provided for @recommendedForYourTrip.
  ///
  /// In en, this message translates to:
  /// **'Recommended for your trip'**
  String get recommendedForYourTrip;

  /// No description provided for @hostProfileUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Host profile is not available right now.'**
  String get hostProfileUnavailable;

  /// No description provided for @signInToMessageHosts.
  ///
  /// In en, this message translates to:
  /// **'Sign in to message hosts'**
  String get signInToMessageHosts;

  /// No description provided for @listingBelongsToYou.
  ///
  /// In en, this message translates to:
  /// **'This listing belongs to you.'**
  String get listingBelongsToYou;

  /// No description provided for @signInToFollowHosts.
  ///
  /// In en, this message translates to:
  /// **'Sign in to follow hosts'**
  String get signInToFollowHosts;

  /// No description provided for @cannotFollowOwnProfile.
  ///
  /// In en, this message translates to:
  /// **'You cannot follow your own profile.'**
  String get cannotFollowOwnProfile;

  /// No description provided for @removedFromFollowedHosts.
  ///
  /// In en, this message translates to:
  /// **'Removed from followed hosts.'**
  String get removedFromFollowedHosts;

  /// No description provided for @nowFollowingHost.
  ///
  /// In en, this message translates to:
  /// **'You are now following this host.'**
  String get nowFollowingHost;

  /// No description provided for @couldNotUpdateFollowStatus.
  ///
  /// In en, this message translates to:
  /// **'Could not update follow status'**
  String get couldNotUpdateFollowStatus;

  /// No description provided for @loadingHostDetails.
  ///
  /// In en, this message translates to:
  /// **'Loading host details...'**
  String get loadingHostDetails;

  /// No description provided for @followButton.
  ///
  /// In en, this message translates to:
  /// **'Follow'**
  String get followButton;

  /// No description provided for @followingButton.
  ///
  /// In en, this message translates to:
  /// **'Following'**
  String get followingButton;

  /// No description provided for @messageButton.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get messageButton;

  /// No description provided for @hostLabel.
  ///
  /// In en, this message translates to:
  /// **'Host'**
  String get hostLabel;

  /// No description provided for @nBeds.
  ///
  /// In en, this message translates to:
  /// **'{count} {count, plural, =1{bed} other{beds}}'**
  String nBeds(int count);

  /// No description provided for @nBedrooms.
  ///
  /// In en, this message translates to:
  /// **'{count} {count, plural, =1{bedroom} other{bedrooms}}'**
  String nBedrooms(int count);

  /// No description provided for @nBathrooms.
  ///
  /// In en, this message translates to:
  /// **'{count} {count, plural, =1{bathroom} other{bathrooms}}'**
  String nBathrooms(int count);

  /// No description provided for @nReviewsParenthetical.
  ///
  /// In en, this message translates to:
  /// **'({count} {count, plural, =1{review} other{reviews}})'**
  String nReviewsParenthetical(int count);

  /// No description provided for @hostReviewsAndFollowers.
  ///
  /// In en, this message translates to:
  /// **'{reviewCount} reviews · {followerCount} followers'**
  String hostReviewsAndFollowers(int reviewCount, int followerCount);

  /// No description provided for @listingFallback.
  ///
  /// In en, this message translates to:
  /// **'Listing'**
  String get listingFallback;

  /// No description provided for @propertiesSection.
  ///
  /// In en, this message translates to:
  /// **'Properties'**
  String get propertiesSection;

  /// No description provided for @toursSection.
  ///
  /// In en, this message translates to:
  /// **'Tours'**
  String get toursSection;

  /// No description provided for @transportSection.
  ///
  /// In en, this message translates to:
  /// **'Transport'**
  String get transportSection;

  /// No description provided for @tourPackagesSection.
  ///
  /// In en, this message translates to:
  /// **'Tour packages'**
  String get tourPackagesSection;

  /// No description provided for @platformFeePercent.
  ///
  /// In en, this message translates to:
  /// **'Platform fee ({percent}%)'**
  String platformFeePercent(String percent);

  /// No description provided for @stays.
  ///
  /// In en, this message translates to:
  /// **'Stays'**
  String get stays;

  /// No description provided for @events.
  ///
  /// In en, this message translates to:
  /// **'Events'**
  String get events;

  /// No description provided for @eventsComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Events coming soon'**
  String get eventsComingSoon;

  /// No description provided for @seeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get seeAll;

  /// No description provided for @staysInCity.
  ///
  /// In en, this message translates to:
  /// **'Stays in {city}'**
  String staysInCity(String city);

  /// No description provided for @loadMoreLeft.
  ///
  /// In en, this message translates to:
  /// **'Load more ({count} left)'**
  String loadMoreLeft(int count);

  /// No description provided for @promoCodeCopied.
  ///
  /// In en, this message translates to:
  /// **'Promo code copied: {code}'**
  String promoCodeCopied(String code);

  /// No description provided for @tourInLocation.
  ///
  /// In en, this message translates to:
  /// **'Tour in {location}'**
  String tourInLocation(String location);

  /// No description provided for @tourPackageInLocation.
  ///
  /// In en, this message translates to:
  /// **'Tour package in {location}'**
  String tourPackageInLocation(String location);
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'fr', 'rw', 'sw', 'zh'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'fr':
      return AppLocalizationsFr();
    case 'rw':
      return AppLocalizationsRw();
    case 'sw':
      return AppLocalizationsSw();
    case 'zh':
      return AppLocalizationsZh();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}

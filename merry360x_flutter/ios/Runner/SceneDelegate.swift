import Flutter
import UIKit

class SceneDelegate: FlutterSceneDelegate {
	private var styleChannel: FlutterMethodChannel?

	override func scene(
		_ scene: UIScene,
		willConnectTo session: UISceneSession,
		options connectionOptions: UIScene.ConnectionOptions
	) {
		super.scene(scene, willConnectTo: session, options: connectionOptions)

		guard let flutterViewController = window?.rootViewController as? FlutterViewController else {
			return
		}

		let channel = FlutterMethodChannel(
			name: "merry360x/system_theme",
			binaryMessenger: flutterViewController.binaryMessenger
		)
		channel.setMethodCallHandler { [weak self] call, result in
			guard call.method == "setPlatformStyle" else {
				result(FlutterMethodNotImplemented)
				return
			}

			guard let style = call.arguments as? String else {
				result(
					FlutterError(
						code: "invalid-args",
						message: "Expected a style string.",
						details: nil
					)
				)
				return
			}

			self?.applyInterfaceStyle(style)
			result(nil)
		}
		styleChannel = channel
	}

	private func applyInterfaceStyle(_ style: String) {
		guard #available(iOS 13.0, *) else { return }

		let resolved: UIUserInterfaceStyle
		switch style {
		case "dark":
			resolved = .dark
		case "light":
			resolved = .light
		default:
			resolved = .unspecified
		}

		if let primaryWindow = window {
			primaryWindow.overrideUserInterfaceStyle = resolved
		}

		for connectedScene in UIApplication.shared.connectedScenes {
			guard let windowScene = connectedScene as? UIWindowScene else { continue }
			for sceneWindow in windowScene.windows {
				sceneWindow.overrideUserInterfaceStyle = resolved
			}
		}
	}

}

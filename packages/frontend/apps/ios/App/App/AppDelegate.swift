import UIKit
import Capacitor
import AppsFlyerLib
import AppTrackingTransparency

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, AppsFlyerLibDelegate, DeepLinkDelegate {
  func onConversionDataSuccess(_ conversionInfo: [AnyHashable : Any]) {
    print("onConversionDataSuccess: \(conversionInfo)")
  }
  
  func onConversionDataFail(_ error: any Error) {
    print("onConversionDataFail: \(error)")
  }
  

  var window: UIWindow?
  var appFlyerReady = false

  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

      // Get AppsFlyer preferences from .plist file
      guard let propertiesPath = Bundle.main.path(forResource: "afdevkey", ofType: "plist"),
          let properties = NSDictionary(contentsOfFile: propertiesPath) as? [String:String] else {
              print("WARNING: Cannot find `afdevkey`")
              return true
      }
      guard let appsFlyerDevKey = properties["appsFlyerDevKey"],
            let appleAppID = properties["appleAppID"] else {
              print("WARNING: Cannot find `appsFlyerDevKey` or `appleAppID` key")
              return true
      }
    
    if appsFlyerDevKey.isEmpty || appleAppID.isEmpty {
      return true
    }
    
    self.appFlyerReady = true

    AppsFlyerLib.shared().isDebug = true

    AppsFlyerLib.shared().appsFlyerDevKey = appsFlyerDevKey
    AppsFlyerLib.shared().appleAppID = appleAppID

    AppsFlyerLib.shared().waitForATTUserAuthorization(timeoutInterval: 60)
                   
    AppsFlyerLib.shared().delegate = self
    AppsFlyerLib.shared().deepLinkDelegate = self
    
    print("Appflyer is ready")
    
    return true
  }

  func applicationWillResignActive(_ application: UIApplication) {
      // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
      // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
  }

  func applicationDidEnterBackground(_ application: UIApplication) {
      // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
      // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
  }

  func applicationWillEnterForeground(_ application: UIApplication) {
      // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
  }

  func applicationDidBecomeActive(_ application: UIApplication) {
      // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    
//    if self.appFlyerReady {
//      AppsFlyerLib.shared().start()
//      if #available(iOS 14, *) {
//        ATTrackingManager.requestTrackingAuthorization { (status) in
//          switch status {
//          case .denied:
//            print("AuthorizationStatus is denied")
//          case .notDetermined:
//            print("AuthorizationStatus is notDetermined")
//          case .restricted:
//            print("AuthorizationStatus is restricted")
//          case .authorized:
//            print("AuthorizationStatus is authorized")
//          @unknown default:
//            fatalError("Invalid authorization status")
//          }
//        }
//      }
//    }
  }

  func applicationWillTerminate(_ application: UIApplication) {
      // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
  }

  func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    // Called when the app was launched with a url. Feel free to add additional processing here,
    // but if you want the App API to support tracking app url opens, make sure to keep this call
    if self.appFlyerReady {
      AppsFlyerLib.shared().handleOpen(url, options: options)
    }
    return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
  }

  func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
      // Called when the app was launched with an activity, including Universal Links.
      // Feel free to add additional processing here, but if you want the App API to support
      // tracking app url opens, make sure to keep this call
      return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }
}

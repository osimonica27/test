//
//  ApplicationBridgedWindowScript.swift
//  App
//
//  Created by 秋星桥 on 2025/1/8.
//

import Foundation
import WebKit

enum ApplicationBridgedWindowScript: String {
  case getCurrentDocContentInMarkdown = "return await window.getCurrentDocContentInMarkdown();"
  case getCurrentServerBaseUrl = "window.getCurrentServerBaseUrl()"
  case getCurrentWorkspaceId = "window.getCurrentWorkspaceId();"
  case getCurrentDocId = "window.getCurrentDocId();"
  
  var requiresAsyncContext: Bool {
    switch self {
    case .getCurrentDocContentInMarkdown: return true
    default: return false
    }
  }
}

extension WKWebView {
  func evaluateScript(_ script: ApplicationBridgedWindowScript, callback: @escaping (Any?) -> ()) {
    if script.requiresAsyncContext {
      callAsyncJavaScript(
        script.rawValue,
        arguments: [:],
        in: nil,
        in: .page
      ) { callback($0) }
    } else {
      evaluateJavaScript(script.rawValue) { output, _ in callback(output) }
    }
  }
}



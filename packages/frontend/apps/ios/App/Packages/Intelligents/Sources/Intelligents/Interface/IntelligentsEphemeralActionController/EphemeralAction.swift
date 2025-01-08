//
//  EphemeralAction.swift
//  Intelligents
//
//  Created by 秋星桥 on 2025/1/8.
//

import Foundation

public extension IntelligentsEphemeralActionController {
  enum EphemeralAction {
    public enum Language: String {
      case langEnglish = "English"
      case langSpanish = "Spanish"
      case langGerman = "German"
      case langFrench = "French"
      case langItalian = "Italian"
      case langSimplifiedChinese = "Simplified Chinese"
      case langTraditionalChinese = "Traditional Chinese"
      case langJapanese = "Japanese"
      case langRussian = "Russian"
      case langKorean = "Korean"
    }

    case translate(to: Language, workspaceID: String, documentID: String)
    case summarize(workspaceID: String, documentID: String)
  }
}

extension IntelligentsEphemeralActionController.EphemeralAction {
  var title: String {
    switch self {
    case let .translate(to, _, _):
      String(format: NSLocalizedString("Translate to %@", comment: ""), to.rawValue)
    case .summarize:
      NSLocalizedString("Summarize", comment: "")
    }
  }
}

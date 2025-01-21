//
//  MessageListView+AssistantCell.swift
//  FlowDown
//
//  Created by 秋星桥 on 2025/1/2.
//

import Combine
import MarkdownParser
import MarkdownView
import UIKit

extension MessageListView {
  class AssistantCell: BaseCell {
    let markdownView = MarkdownView()

    override func initializeContent() {
      super.initializeContent()

      containerView.addSubview(markdownView)
    }

    override func prepareForReuse() {
      super.prepareForReuse()
      markdownView.prepareForReuse()
    }

    override func updateContent(
      object: any MessageListView.Element.ViewModel,
      originalObject _: Element.UserObject?
    ) {
      guard let object = object as? ViewModel else {
        assertionFailure()
        return
      }
      _ = object
    }

    override func layoutContent(cache: any MessageListView.TableLayoutEngine.LayoutCache) {
      super.layoutContent(cache: cache)
      guard let cache = cache as? LayoutCache else {
        assertionFailure()
        return
      }
      markdownView.frame = cache.markdownFrame

      UIView.performWithoutAnimation {
        markdownView.updateContentViews(cache.manifests)
      }
    }

    override class func layoutInsideContainer(
      containerWidth: CGFloat,
      object: any MessageListView.Element.ViewModel
    ) -> any MessageListView.TableLayoutEngine.LayoutCache {
      guard let object = object as? ViewModel else {
        assertionFailure()
        return LayoutCache()
      }
      let cache = LayoutCache()
      cache.width = containerWidth

      var height: CGFloat = 0
      let manifests = object.blocks.map {
        let ret = $0.manifest(theme: object.theme)
        ret.setLayoutTheme(.default)
        ret.setLayoutWidth(containerWidth)
        ret.layoutIfNeeded()
        height += ret.size.height + Theme.default.spacings.final
        return ret
      }
      if height > 0 { height -= Theme.default.spacings.final }
      let rect = CGRect(x: 0, y: 0, width: containerWidth, height: height)
      cache.markdownFrame = rect
      cache.manifests = manifests
      cache.height = rect.maxY

      return cache
    }
  }
}

extension MessageListView.AssistantCell {
  class ViewModel: MessageListView.Element.ViewModel {
    var theme: Theme
    var blocks: [BlockNode]

    enum GroupLocation {
      case begin
      case center
      case end
    }

    var groupLocation: GroupLocation = .center

    init(theme: Theme = .default, blocks: [BlockNode]) {
      self.theme = theme
      self.blocks = blocks
    }

    func contentIdentifier(hasher: inout Hasher) {
      hasher.combine(blocks)
    }
  }
}

extension MessageListView.AssistantCell {
  class LayoutCache: MessageListView.TableLayoutEngine.LayoutCache {
    var width: CGFloat = 0
    var height: CGFloat = 0

    var markdownFrame: CGRect = .zero
    var manifests: [AnyBlockManifest] = []
  }
}

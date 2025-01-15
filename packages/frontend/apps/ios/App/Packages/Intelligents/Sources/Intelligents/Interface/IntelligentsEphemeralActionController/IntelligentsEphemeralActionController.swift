//
//  IntelligentsEphemeralActionController.swift
//  Intelligents
//
//  Created by 秋星桥 on 2025/1/8.
//

import UIKit

public class IntelligentsEphemeralActionController: UIViewController {
  let ation: EphemeralAction
  let scrollView = UIScrollView()
  let stackView = UIStackView()

  let header = Header()
  let preview = RotatedImagePreview()
  
  var documentContainer: UIView = .init()

  public init(action: EphemeralAction) {
    ation = action
    super.init(nibName: nil, bundle: nil)
    title = action.title
  }

  @available(*, unavailable)
  required init?(coder _: NSCoder) {
    fatalError()
  }

  override public func viewDidLoad() {
    super.viewDidLoad()

    header.titleLabel.text = title
    header.dropMenu.isHidden = true
    header.moreMenu.isHidden = true
    overrideUserInterfaceStyle = .dark
    hideKeyboardWhenTappedAround()

    view.addSubview(header)
    header.translatesAutoresizingMaskIntoConstraints = false
    [
      header.topAnchor.constraint(equalTo: view.topAnchor),
      header.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      header.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      header.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 44),
    ].forEach { $0.isActive = true }

    view.backgroundColor = .systemBackground

    scrollView.clipsToBounds = true
    scrollView.alwaysBounceVertical = true
    scrollView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(scrollView)
    scrollView.translatesAutoresizingMaskIntoConstraints = false
    [
      scrollView.topAnchor.constraint(equalTo: header.bottomAnchor),
      scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ].forEach { $0.isActive = true }

    let contentView = UIView()
    scrollView.addSubview(contentView)
    contentView.translatesAutoresizingMaskIntoConstraints = false
    [
      contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
      contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
      contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
      contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
      contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
      contentView.heightAnchor.constraint(greaterThanOrEqualTo: scrollView.heightAnchor),
    ].forEach { $0.isActive = true }

    contentView.addSubview(stackView)
    stackView.translatesAutoresizingMaskIntoConstraints = false
    stackView.axis = .vertical
    stackView.spacing = 16
    stackView.alignment = .fill
    stackView.distribution = .fill
    contentView.addSubview(stackView)

    let stackViewInset: CGFloat = 8
    [
      stackView.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: stackViewInset),
      stackView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: stackViewInset),
      stackView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -stackViewInset),
      stackView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -stackViewInset),
    ].forEach { $0.isActive = true }

    setupContentViews()
  }

  func setupContentViews() {
    defer { stackView.addArrangedSubview(UIView()) }

    preview.layer.cornerRadius = 16
    preview.clipsToBounds = true
    preview.contentMode = .scaleAspectFill
    preview.translatesAutoresizingMaskIntoConstraints = false
    stackView.addArrangedSubview(preview)

    let headerGroup = UIView()
    headerGroup.translatesAutoresizingMaskIntoConstraints = false
    stackView.addArrangedSubview(headerGroup)

    let headerLabel = UILabel()
    let headerIcon = UIImageView()

    headerLabel.translatesAutoresizingMaskIntoConstraints = false
    headerLabel.text = NSLocalizedString("AFFiNE AI", comment: "")
    headerLabel.font = .preferredFont(for: .title3, weight: .bold)
    headerLabel.textColor = .white
    headerLabel.textAlignment = .left
    headerIcon.translatesAutoresizingMaskIntoConstraints = false
    headerIcon.image = .init(named: "spark", in: .module, with: nil)
    headerIcon.contentMode = .scaleAspectFit
    headerIcon.tintColor = .accent
    headerGroup.addSubview(headerLabel)
    headerGroup.addSubview(headerIcon)
    [
      headerIcon.leadingAnchor.constraint(equalTo: headerGroup.leadingAnchor),
      headerIcon.centerYAnchor.constraint(equalTo: headerGroup.centerYAnchor),
      headerIcon.widthAnchor.constraint(equalToConstant: 32),

      headerLabel.leadingAnchor.constraint(equalTo: headerIcon.trailingAnchor, constant: 16),
      headerLabel.topAnchor.constraint(equalTo: headerGroup.topAnchor),
      headerLabel.bottomAnchor.constraint(equalTo: headerGroup.bottomAnchor),
    ].forEach { $0.isActive = true }
    
    stackView.addArrangedSubview(documentContainer)
  }

  public func configure(previewImage: UIImage) {
    preview.configure(previewImage: previewImage)
  }

  private var isFirstAppear: Bool = true
  override public func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    guard isFirstAppear else { return }
    isFirstAppear = false
    onFirstAppear()
  }

  func onFirstAppear() {
    beginAction()
  }
}

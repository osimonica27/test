//
//  ChatTableView.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/11/18.
//

import UIKit

class ChatTableView: UIView {
  let tableView = UITableView()
  let footerView = UIView()

  var dataSource: [DataElement] = []

  var scrollToBottomEnabled = false
  var scrollToBottomAllowed = false

  init() {
    super.init(frame: .zero)

    for eachCase in DataElement.CellType.allCases {
      let cellClass = eachCase.cellClassType
      tableView.register(cellClass, forCellReuseIdentifier: eachCase.cellIdentifier)
    }

    tableView.backgroundColor = .clear

    tableView.delegate = self
    tableView.dataSource = self
    addSubview(tableView)

    tableView.translatesAutoresizingMaskIntoConstraints = false
    [
      tableView.topAnchor.constraint(equalTo: topAnchor),
      tableView.leadingAnchor.constraint(equalTo: leadingAnchor),
      tableView.trailingAnchor.constraint(equalTo: trailingAnchor),
      tableView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ].forEach { $0.isActive = true }

    footerView.translatesAutoresizingMaskIntoConstraints = false
    footerView.heightAnchor.constraint(equalToConstant: 128).isActive = true
    footerView.widthAnchor.constraint(equalToConstant: 128).isActive = true
    tableView.tableFooterView = footerView
    tableView.separatorStyle = .none
  }

  @available(*, unavailable)
  required init?(coder _: NSCoder) {
    fatalError()
  }

  func reloadData() {
    tableView.reloadData()
  }
}

//
//  alera_watchApp.swift
//  alera_watch Watch App
//

import SwiftUI

@main
struct alera_watch_Watch_AppApp: App {
    init() {
        WatchSessionManager.shared.activate()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

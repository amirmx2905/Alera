import Combine
import Foundation
import WatchConnectivity

final class WatchSessionManager: NSObject, ObservableObject {
    static let shared = WatchSessionManager()

    @Published private(set) var habits: [Habit] = []
    @Published private(set) var isReachable: Bool = false
    @Published private(set) var lastError: String? = nil

    private override init() {
        super.init()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    func sendLog(habitId: String, value: Double, completion: @escaping (Bool) -> Void) {
        let previousValue = habits.first(where: { $0.id == habitId })?.todayValue
        let optimisticValue = (previousValue ?? 0) + value
        applyTodayValue(habitId: habitId, newValue: optimisticValue)

        let message: [String: Any] = [
            "type": "LOG_HABIT",
            "habitId": habitId,
            "value": value,
        ]
        send(message: message) { [weak self] success in
            if !success, let previousValue = previousValue {
                self?.applyTodayValue(habitId: habitId, newValue: previousValue)
            }
            completion(success)
        }
    }

    func unlogHabitToday(habitId: String, completion: @escaping (Bool) -> Void) {
        let previousValue = habits.first(where: { $0.id == habitId })?.todayValue
        applyTodayValue(habitId: habitId, newValue: 0)

        let message: [String: Any] = [
            "type": "UNLOG_HABIT_TODAY",
            "habitId": habitId,
        ]
        send(message: message) { [weak self] success in
            if !success, let previousValue = previousValue {
                self?.applyTodayValue(habitId: habitId, newValue: previousValue)
            }
            completion(success)
        }
    }

    private func applyTodayValue(habitId: String, newValue: Double) {
        DispatchQueue.main.async {
            guard let idx = self.habits.firstIndex(where: { $0.id == habitId }) else { return }
            self.habits[idx].todayValue = newValue
        }
    }

    private func send(message: [String: Any], completion: @escaping (Bool) -> Void) {
        let session = WCSession.default
        guard session.isReachable else {
            DispatchQueue.main.async {
                self.lastError = "iPhone is not reachable"
                completion(false)
            }
            return
        }
        session.sendMessage(
            message,
            replyHandler: { _ in
                DispatchQueue.main.async {
                    self.lastError = nil
                    completion(true)
                }
            },
            errorHandler: { error in
                DispatchQueue.main.async {
                    self.lastError = error.localizedDescription
                    completion(false)
                }
            }
        )
    }

    private func ingest(applicationContext: [String: Any]) {
        guard let raw = applicationContext["habits"] as? [[String: Any]] else { return }
        do {
            let data = try JSONSerialization.data(withJSONObject: raw)
            let decoded = try JSONDecoder().decode([Habit].self, from: data)
            DispatchQueue.main.async {
                self.habits = decoded
            }
        } catch {
            DispatchQueue.main.async {
                self.lastError = "Failed to parse habits: \(error.localizedDescription)"
            }
        }
    }
}

extension WatchSessionManager: WCSessionDelegate {
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        let context = session.receivedApplicationContext
        let reachable = session.isReachable
        let errorMessage = error?.localizedDescription
        DispatchQueue.main.async {
            self.isReachable = reachable
            if let errorMessage = errorMessage {
                self.lastError = errorMessage
            }
        }
        ingest(applicationContext: context)
    }

    func session(
        _ session: WCSession,
        didReceiveApplicationContext applicationContext: [String: Any]
    ) {
        ingest(applicationContext: applicationContext)
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        let reachable = session.isReachable
        DispatchQueue.main.async {
            self.isReachable = reachable
        }
    }
}

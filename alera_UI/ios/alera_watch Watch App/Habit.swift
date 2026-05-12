import Foundation

struct Habit: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let type: HabitType
    let unit: String
    let goalAmount: Double
    var todayValue: Double

    enum HabitType: String, Codable {
        case numeric
        case binary
    }

    var isComplete: Bool {
        goalAmount > 0 && todayValue >= goalAmount
    }

    var progressLabel: String {
        let target = Int(goalAmount.rounded())
        let current = Int(todayValue.rounded())
        if type == .binary {
            return isComplete ? "Done" : "Tap to log"
        }
        return "\(current)/\(target) \(unit)"
    }
}

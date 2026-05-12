import SwiftUI
import WatchKit

struct NumericHabitView: View {
    let habit: Habit
    let onLog: (Double) -> Void

    @State private var value: Double
    @State private var isSending: Bool = false
    @FocusState private var isCrownFocused: Bool
    @Environment(\.dismiss) private var dismiss

    init(habit: Habit, onLog: @escaping (Double) -> Void) {
        self.habit = habit
        self.onLog = onLog
        let defaultStep = max(1, habit.goalAmount > 0 ? habit.goalAmount / 4 : 1)
        _value = State(initialValue: defaultStep.rounded())
    }

    private var crownMax: Double {
        999
    }

    private var projectedProgress: Double {
        guard habit.goalAmount > 0 else { return 0 }
        return min(1.0, (habit.todayValue + value) / habit.goalAmount)
    }

    var body: some View {
        ZStack {
            LinearGradient.aleraBackground.ignoresSafeArea()

            VStack(spacing: 6) {
                Text(habit.name)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.aleraText)
                    .multilineTextAlignment(.center)
                    .lineLimit(1)

                Text("\(Int(habit.todayValue))/\(Int(habit.goalAmount)) \(habit.unit)")
                    .font(.system(size: 10))
                    .foregroundStyle(Color.aleraTextTertiary)

                crownValueDisplay

                progressBar

                Button(action: handleLog) {
                    if isSending {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .tint(.white)
                    } else {
                        Text("Log")
                            .font(.system(size: 14, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.aleraPurple)
                .disabled(isSending)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
        }
        .containerBackground(LinearGradient.aleraBackground, for: .navigation)
        .onAppear {
            isCrownFocused = true
        }
    }

    private var crownValueDisplay: some View {
        VStack(spacing: 0) {
            Text("\(Int(value))")
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundStyle(Color.aleraText)
                .contentTransition(.numericText())
                .animation(.snappy, value: value)
            Text(habit.unit)
                .font(.system(size: 12))
                .foregroundStyle(Color.aleraPurpleLight)
        }
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity)
        .background(AleraCardBackground())
        .focusable()
        .focused($isCrownFocused)
        .digitalCrownRotation(
            $value,
            from: 1,
            through: crownMax,
            by: 1,
            sensitivity: .high,
            isContinuous: false,
            isHapticFeedbackEnabled: true
        )
    }

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.white.opacity(0.1))
                RoundedRectangle(cornerRadius: 2)
                    .fill(LinearGradient.aleraPurpleHorizontal)
                    .frame(width: geo.size.width * projectedProgress)
            }
        }
        .frame(height: 4)
    }

    private func handleLog() {
        isSending = true
        onLog(value)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            isSending = false
            dismiss()
        }
    }
}

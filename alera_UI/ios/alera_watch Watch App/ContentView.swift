//
//  ContentView.swift
//  alera_watch Watch App
//

import SwiftUI
import WatchKit

struct ContentView: View {
    @StateObject private var session = WatchSessionManager.shared

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient.aleraBackground.ignoresSafeArea()
                Group {
                    if session.habits.isEmpty {
                        emptyState
                    } else {
                        habitList
                    }
                }
            }
            .navigationTitle("Alera")
            .containerBackground(LinearGradient.aleraBackground, for: .navigation)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "iphone.gen3")
                .font(.title2)
                .foregroundStyle(Color.aleraPurpleLight)
            Text("Open Alera on your iPhone to sync today's habits")
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(Color.aleraTextSecondary)
        }
        .padding(.horizontal, 12)
    }

    private func handleResult(_ success: Bool) {
        WKInterfaceDevice.current().play(success ? .success : .failure)
    }

    private var habitList: some View {
        ScrollView {
            VStack(spacing: 8) {
                ForEach(session.habits) { habit in
                    HabitRow(
                        habit: habit,
                        onLog: { value in
                            session.sendLog(habitId: habit.id, value: value, completion: handleResult)
                        },
                        onUnlog: {
                            session.unlogHabitToday(habitId: habit.id, completion: handleResult)
                        }
                    )
                }
            }
            .padding(.horizontal, 4)
            .padding(.bottom, 4)
        }
    }
}

private struct HabitRow: View {
    let habit: Habit
    let onLog: (Double) -> Void
    let onUnlog: () -> Void

    var body: some View {
        if habit.type == .binary {
            BinaryHabitRow(habit: habit, onLog: onLog, onUnlog: onUnlog)
        } else {
            NumericHabitNavLink(habit: habit, onLog: onLog)
        }
    }
}

private struct BinaryHabitRow: View {
    let habit: Habit
    let onLog: (Double) -> Void
    let onUnlog: () -> Void

    var body: some View {
        Button {
            if habit.isComplete {
                onUnlog()
            } else {
                onLog(1)
            }
        } label: {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(habit.name)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.aleraText)
                        .lineLimit(1)
                    Text(habit.progressLabel)
                        .font(.system(size: 11))
                        .foregroundStyle(Color.aleraTextSecondary)
                }
                Spacer()
                Image(systemName: habit.isComplete ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(habit.isComplete ? Color.green : Color.aleraPurpleLight)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(AleraCardBackground())
        }
        .buttonStyle(.plain)
    }
}

private struct NumericHabitNavLink: View {
    let habit: Habit
    let onLog: (Double) -> Void

    var body: some View {
        NavigationLink {
            NumericHabitView(habit: habit, onLog: onLog)
        } label: {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(habit.name)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.aleraText)
                        .lineLimit(1)
                    Text(habit.progressLabel)
                        .font(.system(size: 11))
                        .foregroundStyle(Color.aleraTextSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(Color.aleraPurpleLight)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(AleraCardBackground())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ContentView()
}

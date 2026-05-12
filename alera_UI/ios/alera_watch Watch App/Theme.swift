import SwiftUI

extension Color {
    static let aleraBackground = Color(red: 0.043, green: 0.000, blue: 0.071)
    static let aleraBackgroundDeep = Color(red: 0.078, green: 0.020, blue: 0.149)
    static let aleraPurple = Color(red: 0.486, green: 0.227, blue: 0.929)
    static let aleraPurpleLight = Color(red: 0.655, green: 0.545, blue: 0.976)
    static let aleraSurface = Color.white.opacity(0.06)
    static let aleraBorder = Color(red: 0.486, green: 0.227, blue: 0.929).opacity(0.25)
    static let aleraText = Color.white
    static let aleraTextSecondary = Color.white.opacity(0.6)
    static let aleraTextTertiary = Color.white.opacity(0.45)
}

extension LinearGradient {
    static let aleraBackground = LinearGradient(
        colors: [Color.aleraBackground, Color.aleraBackgroundDeep],
        startPoint: .top,
        endPoint: .bottom
    )

    static let aleraPurpleHorizontal = LinearGradient(
        colors: [Color.aleraPurple, Color.aleraPurpleLight],
        startPoint: .leading,
        endPoint: .trailing
    )
}

struct AleraCardBackground: View {
    var cornerRadius: CGFloat = 16

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(Color.aleraSurface)
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.aleraBorder, lineWidth: 1)
            )
    }
}

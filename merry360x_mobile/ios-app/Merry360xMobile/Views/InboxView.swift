import SwiftUI

struct InboxView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @StateObject private var viewModel = InboxViewModel()

    var body: some View {
        List {
            if viewModel.loading {
                ProgressView("Loading inbox...")
            }
            if let error = viewModel.errorMessage {
                Text(error).foregroundColor(.red)
            }
            ForEach(Array(viewModel.notifications.enumerated()), id: \.offset) { _, item in
                VStack(alignment: .leading, spacing: 4) {
                    Text((item["title"] as? String) ?? "Notification")
                        .font(.headline)
                    Text((item["message"] as? String) ?? "")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 4)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Inbox")
        .task {
            if let userId = session.userId {
                await viewModel.load(userId: userId)
            }
        }
    }
}

#Preview {
    NavigationStack { InboxView() }
        .environmentObject(AppSessionViewModel())
}

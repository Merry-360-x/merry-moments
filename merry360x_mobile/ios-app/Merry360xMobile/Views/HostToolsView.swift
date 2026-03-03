import SwiftUI

struct HostToolsView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @StateObject private var viewModel = HostToolsViewModel()

    var body: some View {
        List {
            if viewModel.loading {
                ProgressView("Loading host tools...")
            }
            if let error = viewModel.errorMessage {
                Text(error).foregroundColor(.red)
            }
            ForEach(Array(viewModel.properties.enumerated()), id: \.offset) { _, item in
                VStack(alignment: .leading, spacing: 4) {
                    Text((item["title"] as? String) ?? "Untitled property")
                        .font(.headline)
                    Text((item["location"] as? String) ?? "Unknown")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 4)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Host Tools")
        .task {
            if let userId = session.userId {
                await viewModel.load(hostId: userId)
            }
        }
    }
}

#Preview {
    NavigationStack { HostToolsView() }
        .environmentObject(AppSessionViewModel())
}

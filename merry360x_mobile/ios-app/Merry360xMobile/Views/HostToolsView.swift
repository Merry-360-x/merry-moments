import SwiftUI

struct HostToolsView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @StateObject private var viewModel = HostToolsViewModel()
    @State private var tab = 0

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Picker("Host workspace", selection: $tab) {
                    Text("Overview").tag(0)
                    Text("Financial").tag(1)
                    Text("Create").tag(2)
                }
                .pickerStyle(.segmented)

                if viewModel.loading {
                    MerryLoadingStateView(
                        title: "Loading host tools",
                        subtitle: "Preparing listings, bookings, and payouts...",
                        showCardSkeletons: true
                    )
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if tab == 0 {
                    hostMetric(label: "Listings", value: "\(viewModel.properties.count)")
                    hostMetric(label: "Bookings", value: "\(viewModel.bookings.count)")

                    ForEach(Array(viewModel.properties.enumerated()), id: \.offset) { _, item in
                        VStack(alignment: .leading, spacing: 4) {
                            Text((item["title"] as? String) ?? "Untitled property")
                                .font(.headline)
                            Text((item["location"] as? String) ?? "Unknown")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                } else if tab == 1 {
                    hostMetric(label: "Payout Records", value: "\(viewModel.payouts.count)")
                    hostMetric(label: "Financial Bookings", value: "\(viewModel.bookings.count)")
                    moduleRow("Earnings Breakdown")
                    moduleRow("Payout Requests")
                    moduleRow("Payout History")
                } else {
                    moduleRow("Create Tour")
                    moduleRow("Create Tour Package")
                    moduleRow("Create Transport")
                    moduleRow("Create Car Rental")
                    moduleRow("Create Airport Transfer")
                    moduleRow("Create Story")
                }
            }
            .padding(16)
        }
        .navigationTitle("Host Tools")
        .task {
            if let userId = session.userId {
                await viewModel.load(hostId: userId)
            }
        }
    }

    @ViewBuilder
    private func hostMetric(label: String, value: String) -> some View {
        HStack {
            Text(label).foregroundColor(.secondary)
            Spacer()
            Text(value).fontWeight(.semibold)
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    @ViewBuilder
    private func moduleRow(_ title: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

#Preview {
    NavigationStack { HostToolsView() }
        .environmentObject(AppSessionViewModel())
}

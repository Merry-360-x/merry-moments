import SwiftUI

struct WishlistsView: View {
    var onGoToExplore: () -> Void = {}
    
    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            
            VStack(spacing: 12) {
                Text("No saved stays yet")
                    .font(.system(size: 20, weight: .semibold))
                
                Text("Save listings from Explore and they'll appear here.")
                    .font(.system(size: 15))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                
                Button(action: onGoToExplore) {
                    Text("Go to Explore")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(AppTheme.coral)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
            }
            
            Spacer()
            Spacer()
        }
        .background(Color.white)
    }
}

#Preview {
    WishlistsView()
}

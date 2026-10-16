import StoreKit
import SwiftUI

/// 12롤을 넘긴 뒤 롤을 추가할 때. 심사에 필요한 기간, 가격, 자동 갱신, 약관 링크를 이 화면에 둔다.
struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    private var subscriptions: Subscriptions { .shared }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("롤 12개까지는 기능 제한 없이 무료예요. 지금 \(RollQuota.used(in: context))개를 만들었어요. 다음 롤을 추가하려면 월 구독이 필요해요.")
                        .font(.body)

                    VStack(alignment: .leading, spacing: 6) {
                        Text("필름함 Plus").font(.title2.bold())
                        Text(subscriptions.priceText).font(.title3)
                        Text("기간 1개월 · 자동 갱신").font(.subheadline).foregroundStyle(.secondary)
                    }

                    Text("구독 기간이 끝나기 최소 24시간 전에 해지하지 않으면 같은 기간으로 이어지고, 그때 요금이 청구돼요. 해지는 설정 › Apple ID › 구독에서 할 수 있어요. 이미 만들어 둔 롤은 구독이 끝나도 그대로 볼 수 있어요.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)

                    Button {
                        Task { await subscriptions.purchase() }
                    } label: {
                        Text(subscriptions.product == nil ? "상품 불러오는 중" : "\(subscriptions.priceText) 구독하기")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.safelight)
                    .disabled(subscriptions.product == nil)

                    Button("구매 복원") { Task { await subscriptions.restore() } }
                        .frame(maxWidth: .infinity)

                    if let message = subscriptions.message {
                        Text(message).font(.footnote).foregroundStyle(.secondary)
                    }

                    HStack(spacing: 16) {
                        NavigationLink("개인정보 처리방침") { PrivacyPolicyView() }
                        Link("이용 약관", destination: Subscriptions.termsURL)
                    }
                    .font(.footnote)
                }
                .padding(20)
                .frame(maxWidth: 520, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.paper)
            .navigationTitle("구독")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } }
            }
            .task { await subscriptions.refresh() }
        }
        #if os(macOS)
        .frame(minWidth: 440, minHeight: 520)
        #endif
    }
}

extension View {
    /// 결제 창. 이 화면을 연 뷰가 `Subscriptions.shared.showPaywall`을 읽어야 갱신된다.
    func rollPaywall() -> some View {
        modifier(RollPaywallModifier())
    }
}

private struct RollPaywallModifier: ViewModifier {
    func body(content: Content) -> some View {
        let shown = Subscriptions.shared.showPaywall
        content.sheet(isPresented: Binding(
            get: { shown },
            set: { Subscriptions.shared.showPaywall = $0 }
        )) {
            PaywallView()
        }
    }
}

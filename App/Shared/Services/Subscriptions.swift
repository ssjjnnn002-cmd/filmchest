import Foundation
import StoreKit
import SwiftData

/// 만든 롤 개수. 지워도 줄지 않아서, 지웠다 다시 만들어 무료 한도를 넘기지 못한다.
enum RollQuota {
    static let freeLimit = 12
    private static let key = "filmchest.rollsEverCreated"

    static func used(in context: ModelContext) -> Int {
        let stored = UserDefaults.standard.integer(forKey: key)
        let current = (try? context.fetchCount(FetchDescriptor<RollItem>())) ?? 0
        let count = max(stored, current)
        if count != stored { UserDefaults.standard.set(count, forKey: key) }
        return count
    }

    static func canAdd(in context: ModelContext) -> Bool {
        used(in: context) < freeLimit
    }

    static func noteCreated(in context: ModelContext) {
        let current = (try? context.fetchCount(FetchDescriptor<RollItem>())) ?? 0
        let stored = UserDefaults.standard.integer(forKey: key)
        UserDefaults.standard.set(max(stored, current), forKey: key)
    }
}

/// 월 구독. 상품 ID는 앱스토어 커넥트에 같은 문자열로 만들어야 한다.
///   kr.filmchest.app.plus.monthly  ·  자동 갱신  ·  1개월  ·  ₩2,500
@MainActor
@Observable
final class Subscriptions {
    static let shared = Subscriptions()
    /// 첫 출시는 구독 없이 전부 무료. 나중에 true로 바꾸면 12롤 이후 월 구독이 다시 켜진다.
    static let subscriptionEnabled = false
    static let productID = "kr.filmchest.app.plus.monthly"
    static let privacyURL = URL(string: "https://filmchest.vercel.app/privacy")!
    static let termsURL = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!

    private(set) var product: Product?
    private(set) var isSubscribed = false
    var showPaywall = false
    var message: String?

    var priceText: String {
        if let product { return "\(product.displayPrice) / 월" }
        return "₩2,500 / 월"
    }

    func listen() async {
        await refresh()
        for await update in Transaction.updates {
            if case .verified(let transaction) = update {
                await transaction.finish()
                await refreshEntitlement()
            }
        }
    }

    func refresh() async {
        do {
            product = try await Product.products(for: [Self.productID]).first
        } catch {
            product = nil
        }
        await refreshEntitlement()
    }

    func refreshEntitlement() async {
        var active = false
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            guard transaction.productID == Self.productID, transaction.revocationDate == nil else { continue }
            if let expiration = transaction.expirationDate, expiration < Date() { continue }
            active = true
        }
        isSubscribed = active
    }

    /// 구독 중이거나 무료 한도 안이면 true. 아니면 결제 창을 연다.
    func allowNewRoll(in context: ModelContext) -> Bool {
        if !Self.subscriptionEnabled { return true }
        if isSubscribed || RollQuota.canAdd(in: context) { return true }
        message = nil
        showPaywall = true
        return false
    }

    func noteRollCreated(in context: ModelContext) {
        RollQuota.noteCreated(in: context)
    }

    func purchase() async {
        guard let product else {
            message = "구독 상품을 아직 불러오지 못했어요. 앱스토어에 상품이 등록된 뒤 다시 시도해 주세요."
            return
        }
        message = nil
        do {
            switch try await product.purchase() {
            case .success(let result):
                guard case .verified(let transaction) = result else {
                    message = "구매를 확인하지 못했어요."
                    return
                }
                await transaction.finish()
                await refreshEntitlement()
                if isSubscribed { showPaywall = false }
            case .userCancelled:
                break
            case .pending:
                message = "구매 승인을 기다리고 있어요."
            @unknown default:
                break
            }
        } catch {
            message = "구매하지 못했어요."
        }
    }

    func restore() async {
        message = nil
        do {
            try await AppStore.sync()
            await refreshEntitlement()
            if isSubscribed {
                showPaywall = false
            } else {
                message = "복원할 구독이 없어요."
            }
        } catch {
            message = "구매를 복원하지 못했어요."
        }
    }
}

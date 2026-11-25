import Foundation
import StoreKit
import SwiftData

/// 무료와 프리미엄 (기획안 3·4번). 결제는 아직 없고 틀만 있다. 웹 web/src/core/premium.ts와 같은 규칙.
/// - Features.premium이 꺼져 있으면(지금) 누구나 모든 기능을 쓴다. 화면도 지금과 똑같다.
/// - 프리미엄인지는 isPremium 한 곳에서만 판단한다. 나중에 StoreKit 2 구독과 텀블벅 코드로 채운다.
/// - 개발자 모드의 '무료/프리미엄 구분 시험'으로 이 기기에서만 켜 보고, 프리미엄 이용 중인 것처럼 바꿔 볼 수 있다.
enum Premium {
    /// 무료로 한 달(기기 시간 기준 1일~말일)에 장착할 수 있는 롤
    static let freeRollsPerMonth = 4
    private static let testKey = "premiumTest"
    private static let devKey = "premiumDev"
    private static var defaults: UserDefaults { AppSettings.defaults }

    /// 무료/프리미엄 구분이 켜졌는지
    static var gateOn: Bool { Features.premium || testOn }

    /// 프리미엄 기능을 쓸 수 있는지. 구분이 꺼져 있으면 늘 true
    static var isPremium: Bool {
        if !gateOn { return true }
        // TODO: StoreKit 2 구독·텀블벅 코드 확인
        return devPremium
    }

    static var testOn: Bool {
        get { defaults.bool(forKey: testKey) }
        set { defaults.set(newValue, forKey: testKey) }
    }
    static var devPremium: Bool {
        get { defaults.bool(forKey: devKey) }
        set { defaults.set(newValue, forKey: devKey) }
    }
    /// 개발자 모드를 끌 때 시험 값도 지운다
    static func clearTest() { testOn = false; devPremium = false }

    /// 그 달 이름 (기기 시간). 예: 2027-01
    static func monthKey(_ date: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month], from: date)
        return String(format: "%04d-%02d", c.year ?? 0, c.month ?? 0)
    }

    /// 이번 달에 장착한 롤 수: 장착할 때마다 센 수(지워도 줄지 않음)와, 이번 달에 장착한 롤(휴지통 포함, 가져온 기존 롤 제외) 중 큰 쪽
    static func loadsThisMonth(in context: ModelContext, now: Date = Date()) -> Int {
        let key = monthKey(now)
        let rolls = (try? context.fetch(FetchDescriptor<RollItem>())) ?? []
        let counted = rolls.filter { !$0.isArchive && monthKey($0.loadedAt) == key }.count
        return max(defaults.integer(forKey: "loads.\(key)"), counted)
    }

    /// 장착 직전에 부른다: 이번 달 센 수를 하나 올린다 (before = 장착 전 loadsThisMonth)
    static func noteRollLoaded(before: Int, now: Date = Date()) {
        defaults.set(before + 1, forKey: "loads.\(monthKey(now))")
    }

    /// 새 롤을 장착할 수 있는지
    static func canLoadRoll(in context: ModelContext) -> Bool {
        isPremium || loadsThisMonth(in: context) < freeRollsPerMonth
    }

    /// 컷별 상세 기록(다이얼 화면)을 새로 열 수 있는지. 이미 남긴 기록은 잠겨도 보이고 고칠 수 있다
    static var canDetailRecord: Bool { isPremium }

    static let rollLimitText = "이번 달 무료 \(freeRollsPerMonth)롤을 모두 장착했어요. 프리미엄은 롤 수 제한이 없어요. 다음 달 1일에 다시 \(freeRollsPerMonth)롤을 장착할 수 있어요."
    static let detailLockText = "컷별 상세 기록은 프리미엄 기능이에요. 이미 남긴 기록은 그대로 볼 수 있어요."
}

/// (예전 계획: 12롤 뒤 월 구독. 꺼져 있음. 결제를 붙일 때 Premium.isPremium으로 옮긴다)
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
    static let privacyURL = URL(string: "https://filmchest.pages.dev/privacy")!
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

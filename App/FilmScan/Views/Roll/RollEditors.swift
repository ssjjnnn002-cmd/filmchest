import SwiftUI
import SwiftData
import FilmScanCore

/// 촬영일 추가/수정. 카메라 카운터 숫자를 넣으면 그 컷부터 이 날로 기록된다.
struct DayEditView: View {
    let roll: RollItem
    let day: ShootingDay?

    @Environment(\.dismiss) private var dismiss
    @State private var date = Date()
    @State private var knowsFrame = true
    @State private var frame = 1
    @State private var placeName = ""
    @State private var point: GeoPoint?
    @State private var weather: WeatherNote?
    @State private var memo = ""
    @State private var location = LocationProvider()
    @State private var confirmDelete = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("촬영 시작", selection: $date)
                }
                Section {
                    Toggle("카운터 확인", isOn: $knowsFrame)
                    if knowsFrame {
                        Stepper(value: $frame, in: 1...max(roll.format.nominalFrameCount + 4, 1)) {
                            LabeledContent("카운터", value: "\(frame)번")
                        }
                    }
                } footer: {
                    Text("카메라 카운터에 보이는 숫자예요. 모르면 끄세요. 스캔을 불러올 때 촬영일끼리 고르게 나눠요.")
                }
                if day == nil {
                    if location.isLocating && point == nil {
                        Section("장소") {
                            HStack { ProgressView().controlSize(.small); Text("현재 위치 찾는 중…").foregroundStyle(.secondary) }
                        }
                    } else {
                        PlacePickerSection(name: $placeName, point: $point, weather: $weather)
                    }
                    Section("메모") {
                        TextField("메모", text: $memo, axis: .vertical)
                    }
                }
                if day != nil {
                    Section {
                        Button("촬영일 삭제", systemImage: "trash", role: .destructive) { confirmDelete = true }
                    }
                }
            }
            .formStyle(.grouped)
            .filmKeyboard()
            .navigationTitle(day == nil ? "촬영일 추가" : "촬영일 수정")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("저장") { save() } }
            }
            .confirmationDialog("이 촬영일을 삭제할까요?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("삭제", role: .destructive) {
                    roll.shootingDays.removeAll { $0.id == day?.id }
                    dismiss()
                }
            }
            .task { await prepare() }
        }
        #if os(macOS)
        .frame(minWidth: 460, minHeight: 560)
        #endif
    }

    private func prepare() async {
        if let day {
            date = day.startedAt
            knowsFrame = day.startFrame != nil
            frame = day.startFrame ?? 1
            return
        }
        // 첫 촬영일이면 1번, 아니면 마지막 기록 다음 컷을 기본값으로
        let lastKnown = max(roll.shootingDays.compactMap(\.startFrame).max() ?? 0,
                            roll.locations.map(\.startFrame).max() ?? 0)
        frame = roll.shootingDays.isEmpty ? 1 : lastKnown + 1
        knowsFrame = roll.shootingDays.isEmpty
        if let place = await location.currentPlace(), point == nil {
            placeName = place.name
            point = place.point
            weather = place.weather
        }
    }

    private func save() {
        let start = knowsFrame ? frame : nil
        if let day, let i = roll.shootingDays.firstIndex(where: { $0.id == day.id }) {
            roll.shootingDays[i].startedAt = date
            roll.shootingDays[i].startFrame = start
        } else {
            roll.shootingDays.append(ShootingDay(startedAt: date, startFrame: roll.shootingDays.isEmpty ? 1 : start))
            let name = placeName.trimmingCharacters(in: .whitespaces)
            let memo = self.memo.nilIfBlank
            if !name.isEmpty || point != nil || memo != nil {
                let segStart = roll.locations.isEmpty ? 1 : (start ?? (roll.sortedLocations.last!.startFrame + 1))
                roll.locations.append(LocationSegment(startFrame: segStart, name: name, point: point, memo: memo, weather: weather))
            }
        }
        dismiss()
    }
}

/// 장소 추가/수정: "몇 번 컷부터 어디"
struct PlaceEditView: View {
    let roll: RollItem
    let segment: LocationSegment?

    @Environment(\.dismiss) private var dismiss
    @State private var frame = 1
    @State private var name = ""
    @State private var point: GeoPoint?
    @State private var weather: WeatherNote?
    @State private var memo = ""
    @State private var confirmDelete = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Stepper(value: $frame, in: 1...max(roll.format.nominalFrameCount + 4, 1)) {
                        LabeledContent("시작 컷", value: "\(frame)번부터")
                    }
                }
                PlacePickerSection(name: $name, point: $point, weather: $weather)
                Section("메모") {
                    TextField("메모", text: $memo, axis: .vertical)
                }
                if segment != nil {
                    Section {
                        Button("장소 삭제", systemImage: "trash", role: .destructive) { confirmDelete = true }
                    }
                }
            }
            .formStyle(.grouped)
            .filmKeyboard()
            .navigationTitle(segment == nil ? "장소 추가" : "장소 수정")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") { save() }.disabled(name.nilIfBlank == nil && point == nil && memo.nilIfBlank == nil)
                }
            }
            .confirmationDialog("이 장소를 삭제할까요?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("삭제", role: .destructive) {
                    roll.locations.removeAll { $0.id == segment?.id }
                    dismiss()
                }
            }
            .onAppear {
                if let segment {
                    frame = segment.startFrame
                    name = segment.name
                    point = segment.point
                    weather = segment.weather
                    memo = segment.memo ?? ""
                } else {
                    frame = roll.locations.isEmpty ? 1 : (roll.sortedLocations.last!.startFrame + 1)
                }
            }
        }
        #if os(macOS)
        .frame(minWidth: 460, minHeight: 560)
        #endif
    }

    private func save() {
        let value = LocationSegment(id: segment?.id ?? UUID(), startFrame: frame,
                                    name: name.trimmingCharacters(in: .whitespaces), point: point, memo: memo.nilIfBlank,
                                    weather: point == nil ? nil : weather)
        if let i = roll.locations.firstIndex(where: { $0.id == value.id }) {
            roll.locations[i] = value
        } else {
            roll.locations.append(value)
        }
        dismiss()
    }
}


/// 현상 맡기기
struct LabDropOffView: View {
    let roll: RollItem

    @Environment(\.dismiss) private var dismiss
    @State private var lab = ""
    @State private var date = Date()
    @State private var showNearby = false

    var body: some View {
        NavigationStack {
            Form {
                Section("현상소") {
                    LabField(lab: $lab)
                    Button("가까운 현상소 찾기", systemImage: "map") { showNearby = true }
                }
                Section {
                    DatePicker("맡긴 날", selection: $date, displayedComponents: .date)
                }
            }
            .formStyle(.grouped)
            .filmKeyboard()
            .navigationTitle("현상 맡기기")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") {
                        LabMemory.remember(lab)
                        roll.labName = lab.nilIfBlank
                        roll.droppedOffAt = date
                        if roll.status == .loaded || roll.status == .finished { roll.status = .atLab }
                        if roll.finishedAt == nil { roll.finishedAt = date }
                        dismiss()
                    }
                }
            }
            .onAppear {
                lab = roll.labName ?? ""
                date = roll.droppedOffAt ?? Date()
            }
            .sheet(isPresented: $showNearby) { NearbyLabsView { lab = $0 } }
        }
        #if os(macOS)
        .frame(minWidth: 420, minHeight: 300)
        #endif
    }
}


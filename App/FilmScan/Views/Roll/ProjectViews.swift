import SwiftUI
import SwiftData
import FilmScanCore

extension ProjectItem {
    var color: Color { Color(PlatformColor(hex: ProjectPalette.hex[max(0, min(colorIndex, ProjectPalette.hex.count - 1))])) }
}

/// 롤 보관함 맨 위: 전체 개수 + 진행 중인 프로젝트 폴더 (보관된 건 따로)
struct ProjectStrip: View {
    let rolls: [RollItem]
    @Query(sort: \ProjectItem.createdAt, order: .reverse) private var projects: [ProjectItem]
    @State private var creating = false

    private var active: [ProjectItem] { projects.filter { !$0.isArchived } }
    private var archivedCount: Int { projects.filter(\.isArchived).count }
    private var liveRollIDs: Set<UUID> { Set(rolls.filter { $0.deletedAt == nil }.map(\.id)) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("롤 \(liveRollIDs.count) · 프로젝트 \(projects.count)")
                    .font(.subheadline.weight(.semibold)).foregroundStyle(.secondary)
                Spacer()
                if archivedCount > 0 {
                    NavigationLink(value: ProjectRoute.archived) {
                        Label("보관됨 \(archivedCount)", systemImage: "archivebox")
                            .font(.subheadline.weight(.medium))
                    }
                    .buttonStyle(.borderless)
                }
            }
            .padding(.horizontal, 20)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(active) { p in
                        NavigationLink(value: ProjectRoute.project(p.id)) {
                            ProjectFolderCard(project: p, count: p.rollIDs.filter(liveRollIDs.contains).count)
                        }
                        .buttonStyle(.plain)
                    }
                    Button { creating = true } label: {
                        VStack(spacing: 6) {
                            Image(systemName: "folder.badge.plus").font(.title2)
                            Text("새 프로젝트").font(.caption.weight(.semibold))
                        }
                        .foregroundStyle(Theme.safelight)
                        .frame(width: 110, height: 92)
                        .background(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.safelight.opacity(0.4), style: StrokeStyle(lineWidth: 1.5, dash: [5, 4])))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16)
            }
        }
        .sheet(isPresented: $creating) { ProjectEditView(project: nil) }
    }
}

enum ProjectRoute: Hashable {
    case project(UUID)
    case archived
}

struct ProjectFolderCard: View {
    let project: ProjectItem
    let count: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: "folder.fill").font(.title2).foregroundStyle(project.color)
            Spacer(minLength: 0)
            Text(project.name).font(.subheadline.weight(.semibold)).lineLimit(1)
            Text("\(count)롤").font(.caption).foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(width: 130, height: 92, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16).fill(Theme.card))
        .overlay(alignment: .topTrailing) {
            Circle().fill(project.color).frame(width: 8, height: 8).padding(12)
        }
    }
}

/// 라우팅: 프로젝트 화면 / 보관된 프로젝트
struct ProjectRouteView: View {
    let route: ProjectRoute
    @Query private var projects: [ProjectItem]

    var body: some View {
        switch route {
        case .archived: ArchivedProjectsView()
        case .project(let id):
            if let p = projects.first(where: { $0.id == id }) { ProjectDetailView(project: p) }
            else { ContentUnavailableView("프로젝트가 없어요", systemImage: "folder") }
        }
    }
}

struct ArchivedProjectsView: View {
    @Query(filter: #Predicate<ProjectItem> { $0.isArchived }, sort: \ProjectItem.createdAt, order: .reverse)
    private var projects: [ProjectItem]

    var body: some View {
        List {
            if projects.isEmpty { ContentUnavailableView("보관된 프로젝트가 없어요", systemImage: "archivebox") }
            ForEach(projects) { p in
                NavigationLink(value: ProjectRoute.project(p.id)) {
                    HStack(spacing: 12) {
                        Image(systemName: "folder.fill").foregroundStyle(p.color).font(.title3)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(p.name)
                            if let memo = p.memo { Text(memo).font(.caption).foregroundStyle(.secondary).lineLimit(1) }
                        }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.paper)
        .navigationTitle("보관된 프로젝트")
    }
}

struct ProjectDetailView: View {
    @Bindable var project: ProjectItem
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \RollItem.loadedAt, order: .reverse) private var allRolls: [RollItem]
    @State private var editing = false
    @State private var adding = false
    @State private var confirmDelete = false

    private var rolls: [RollItem] {
        allRolls.filter { $0.deletedAt == nil && project.contains($0) }
            .sorted { ($0.sortedDays.first?.startedAt ?? $0.loadedAt) > ($1.sortedDays.first?.startedAt ?? $1.loadedAt) }
    }

    var body: some View {
        List {
            Section {
                HStack(spacing: 12) {
                    Image(systemName: "folder.fill").font(.largeTitle).foregroundStyle(project.color)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(rolls.count)롤" + (project.isArchived ? " · 보관됨" : "")).font(.subheadline).foregroundStyle(.secondary)
                        if let memo = project.memo { Text(memo).font(.subheadline) }
                    }
                }
                .padding(.vertical, 4)
            }
            Section {
                if rolls.isEmpty {
                    Text("아직 담긴 롤이 없어요").foregroundStyle(.secondary)
                }
                ForEach(rolls) { roll in
                    NavigationLink(value: roll) { RollRow(roll: roll) }
                        .swipeActions {
                            Button("빼기", systemImage: "folder.badge.minus", role: .destructive) { project.toggle(roll) }
                        }
                }
                Button("롤 담기", systemImage: "plus") { adding = true }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.paper)
        .navigationTitle(project.name)
        .toolbar {
            ToolbarItem {
                Menu("더 보기", systemImage: "ellipsis.circle") {
                    Button("수정", systemImage: "pencil") { editing = true }
                    Button(project.isArchived ? "진행 중으로 꺼내기" : "보관하기",
                           systemImage: project.isArchived ? "tray.and.arrow.up" : "archivebox") {
                        project.isArchived.toggle()
                    }
                    Button("프로젝트 삭제", systemImage: "trash", role: .destructive) { confirmDelete = true }
                }
            }
        }
        .sheet(isPresented: $editing) { ProjectEditView(project: project) }
        .sheet(isPresented: $adding) { ProjectRollPicker(project: project) }
        .confirmationDialog("프로젝트를 삭제할까요? 담긴 롤은 지워지지 않아요.", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("삭제", role: .destructive) {
                context.delete(project)
                dismiss()
            }
        }
    }
}

/// 프로젝트 만들기/수정: 이름, 설명, 색 16가지
struct ProjectEditView: View {
    let project: ProjectItem?
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var memo = ""
    @State private var colorIndex = 0

    var body: some View {
        NavigationStack {
            Form {
                Section("이름") { TextField("프로젝트 이름", text: $name) }
                Section("설명") { TextField("메모 (선택)", text: $memo, axis: .vertical) }
                Section("색") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 8), spacing: 10) {
                        ForEach(ProjectPalette.hex.indices, id: \.self) { i in
                            Circle()
                                .fill(Color(PlatformColor(hex: ProjectPalette.hex[i])))
                                .frame(height: 30)
                                .overlay { if i == colorIndex { Image(systemName: "checkmark").font(.caption.weight(.bold)).foregroundStyle(.white) } }
                                .overlay(Circle().strokeBorder(.primary.opacity(i == colorIndex ? 0.5 : 0), lineWidth: 2).padding(-3))
                                .onTapGesture { colorIndex = i }
                                .accessibilityLabel("색 \(i + 1)")
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .formStyle(.grouped)
            .navigationTitle(project == nil ? "새 프로젝트" : "프로젝트 수정")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") { save() }.disabled(name.nilIfBlank == nil)
                }
            }
            .onAppear {
                if let project {
                    name = project.name
                    memo = project.memo ?? ""
                    colorIndex = project.colorIndex
                }
            }
        }
        #if os(macOS)
        .frame(minWidth: 420, minHeight: 420)
        #endif
    }

    private func save() {
        let target = project ?? ProjectItem(name: "")
        target.name = name.trimmingCharacters(in: .whitespaces)
        target.memo = memo.nilIfBlank
        target.colorIndex = colorIndex
        if project == nil { context.insert(target) }
        dismiss()
    }
}

/// 프로젝트에 롤 담기 (여러 개 선택)
struct ProjectRollPicker: View {
    @Bindable var project: ProjectItem
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \RollItem.loadedAt, order: .reverse) private var rolls: [RollItem]

    var body: some View {
        NavigationStack {
            List(rolls.filter { $0.deletedAt == nil }) { roll in
                Button { project.toggle(roll) } label: {
                    HStack {
                        RollRow(roll: roll)
                        Spacer()
                        Image(systemName: project.contains(roll) ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(project.contains(roll) ? Theme.safelight : .secondary)
                            .font(.title3)
                    }
                }
                .buttonStyle(.plain)
            }
            .navigationTitle("롤 담기")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } } }
        }
    }
}

/// 롤 화면: 이 롤이 들어간 프로젝트 고르기 (여러 개)
struct RollProjectsPicker: View {
    let roll: RollItem
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \ProjectItem.createdAt, order: .reverse) private var projects: [ProjectItem]
    @State private var creating = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(projects) { p in
                    Button { p.toggle(roll) } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "folder.fill").foregroundStyle(p.color)
                            Text(p.name + (p.isArchived ? " (보관됨)" : "")).foregroundStyle(.primary)
                            Spacer()
                            Image(systemName: p.contains(roll) ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(p.contains(roll) ? Theme.safelight : .secondary)
                        }
                    }
                }
                Button("새 프로젝트", systemImage: "folder.badge.plus") { creating = true }
            }
            .navigationTitle("프로젝트에 담기")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } } }
            .sheet(isPresented: $creating) { ProjectEditView(project: nil) }
        }
    }
}

/// 롤 화면에 넣는 "프로젝트" 줄
struct RollProjectsSection: View {
    let roll: RollItem
    @Query(sort: \ProjectItem.createdAt, order: .reverse) private var projects: [ProjectItem]
    @State private var picking = false

    var body: some View {
        Section("프로젝트") {
            let mine = projects.filter { $0.contains(roll) }
            if !mine.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(mine) { p in
                            Label(p.name, systemImage: "folder.fill")
                                .font(.subheadline.weight(.medium))
                                .padding(.horizontal, 10).padding(.vertical, 6)
                                .background(Capsule().fill(p.color.opacity(0.15)))
                                .foregroundStyle(p.color)
                        }
                    }
                }
            }
            Button(mine.isEmpty ? "프로젝트에 담기" : "프로젝트 바꾸기", systemImage: "folder.badge.plus") { picking = true }
        }
        .sheet(isPresented: $picking) { RollProjectsPicker(roll: roll) }
    }
}

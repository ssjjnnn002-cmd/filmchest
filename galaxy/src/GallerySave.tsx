// 웹 ui/GallerySave.tsx — 롤 사진을 갤러리에 저장. 안 되면 같은 버튼이 파일 저장으로 바뀐다.
import { useEffect, useState } from 'react'
import { rollImageFiles, rollZip } from './scan'
import { saveImagesToGallery } from './gallery'
import { saveFileNow } from './platform'
import { Btn } from './kit'

export function RollGalleryButton({ rollId, title, onToast, block }: {
  rollId: string
  title: string
  onToast: (message: string) => void
  block?: boolean
}) {
  const [files, setFiles] = useState<{ uri: string; name: string }[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [wantFile, setWantFile] = useState(false)

  useEffect(() => {
    let cancel = false
    rollImageFiles(rollId).then((list) => { if (!cancel) setFiles(list) })
    return () => { cancel = true }
  }, [rollId])

  if (wantFile) {
    const name = `${title}.zip`.replace(/[/\\:]/g, '-')
    return (
      <Btn label={busy ? '묶는 중…' : '사진 파일로 저장'} icon="download" kind="primary" block={block} disabled={busy} onPress={async () => {
        setBusy(true)
        try { await saveFileNow(name, await rollZip({ id: rollId }), 'application/zip') } finally { setBusy(false) }
      }} />
    )
  }

  const save = async () => {
    if (!files?.length) return
    setBusy(true)
    const r = await saveImagesToGallery(files, `필름함 ${title}`.replace(/[/\\:]/g, '-').slice(0, 60))
    setBusy(false)
    if (r.denied) { onToast('사진 저장을 허용해 주세요'); return }
    if (!r.saved) {
      setWantFile(true)
      onToast('갤러리에 바로 넣지 못해서 사진 파일로 저장할게요.')
      return
    }
    onToast(r.saved < files.length ? `${r.saved}장을 갤러리에 저장했어요` : '갤러리에 저장했어요')
  }

  return <Btn label={busy ? '저장 중…' : '갤러리에 저장'} icon="download" kind="primary" block={block} disabled={!files?.length || busy} onPress={save} />
}

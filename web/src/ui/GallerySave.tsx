import { useEffect, useState } from 'react'
import { rollImageFiles, rollZip } from '../core/importer'
import { saveFileNow, saveToGallery, shareBatches } from '../platform'
import { Icon } from './common'

/** 롤 사진을 갤러리 공유 창으로 보낸다. 창이 안 열리면 같은 버튼이 파일 저장으로 바뀐다. */
export function RollGalleryButton({ rollId, title, onToast, className = 'btn primary' }: {
  rollId: string
  title: string
  onToast: (message: string) => void
  className?: string
}) {
  const [files, setFiles] = useState<File[] | null>(null)
  const [next, setNext] = useState(0)
  const [fileBlob, setFileBlob] = useState<Blob | null>(null)
  const [wantFile, setWantFile] = useState(false)

  useEffect(() => {
    let cancel = false
    rollImageFiles(rollId).then((list) => { if (!cancel) setFiles(list) })
    return () => { cancel = true }
  }, [rollId])

  useEffect(() => {
    if (!wantFile) return
    let cancel = false
    rollZip({ id: rollId }).then((blob) => { if (!cancel) setFileBlob(blob) })
    return () => { cancel = true }
  }, [wantFile, rollId])

  if (wantFile) {
    const name = `${title}.zip`.replace(/[/\\:]/g, '-')
    return (
      <button className={className} disabled={!fileBlob} onClick={() => {
        if (!fileBlob) return
        saveFileNow(name, fileBlob)
        onToast('갤러리에 바로 넣지 못해서 사진 파일로 저장했어요')
      }}>
        {fileBlob ? <><Icon name="download" size={18} /> 사진 파일로 저장</> : <div className="spinner" />}
      </button>
    )
  }

  const save = () => {
    if (!files?.length) return
    const batches = shareBatches(files)
    if (!batches.length) {
      setWantFile(true)
      onToast('이 브라우저는 갤러리 창을 열 수 없어요. 파일로 저장할게요.')
      return
    }
    const index = Math.min(next, batches.length - 1)
    const opened = saveToGallery(batches[index], title)
    if (opened.kind === 'file') {
      onToast('갤러리에 바로 넣지 못해서 사진 파일로 저장했어요')
      return
    }
    if (opened.kind === 'none') {
      setWantFile(true)
      return
    }
    const more = index < batches.length - 1
    onToast(more
      ? '공유 창에서 이미지 저장을 누르세요. 남은 사진도 이어서 저장할 수 있어요.'
      : '공유 창에서 이미지 저장을 누르면 갤러리 최근 항목에 들어가요.')
    void opened.done.then((result) => {
      if (result === 'saved' && more) setNext(index + 1)
      if (result === 'failed') setWantFile(true)
    })
  }

  return (
    <button className={className} disabled={!files?.length} onClick={save}>
      {!files ? <div className="spinner" /> : <Icon name="download" size={18} />}
      {next > 0 ? '이어서 갤러리에 저장' : '갤러리에 저장'}
    </button>
  )
}

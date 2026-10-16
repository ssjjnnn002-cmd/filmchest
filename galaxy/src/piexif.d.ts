declare module 'piexifjs' {
  const piexif: {
    load(data: string): Record<string, Record<number, unknown>>
    dump(exif: Record<string, unknown>): string
    insert(exif: string, jpeg: string): string
    remove(jpeg: string): string
    ImageIFD: Record<string, number>
    ExifIFD: Record<string, number>
    GPSIFD: Record<string, number>
  }
  export default piexif
}

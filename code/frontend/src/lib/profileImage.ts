// 프로필 사진 준비: 사용자가 고른 사진을 정사각형으로 잘라 작게 줄인 JPEG data URL 로 바꾼다.
// 원본 그대로 올리면 수 MB 라서 서버 상한(150KB)을 넘고, 화면에서는 작은 원으로만 보이므로 256px 면 충분하다.

const SIZE = 256
const MAX_INPUT_BYTES = 20 * 1024 * 1024
// data URL 문자열 길이 상한. base64 는 원본의 4/3 배라 150K 자면 디코딩해서 약 112KB 로, 서버 상한(150KB)보다 작다.
const MAX_DATA_URL_LENGTH = 150 * 1024

export class ProfileImageError extends Error {}

export async function makeProfileImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new ProfileImageError('사진 파일만 선택할 수 있어요.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ProfileImageError('사진 용량이 너무 커요. 20MB 이하의 사진을 선택해주세요.')
  }

  let bitmap: ImageBitmap
  try {
    // 스마트폰 사진의 회전 정보(EXIF)를 반영해 바로 세워서 읽는다.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ProfileImageError('이 사진은 열 수 없어요. JPG, PNG, WEBP 사진을 선택해주세요.')
  }

  try {
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const context = canvas.getContext('2d')
    if (!context) throw new ProfileImageError('이 브라우저에서는 사진을 처리할 수 없어요.')

    // 투명 PNG 는 JPEG 로 바꾸면 배경이 검게 나오므로 흰색으로 깐다.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, SIZE, SIZE)
    // 가운데를 정사각형으로 잘라(cover) 채운다.
    const side = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - side) / 2
    const sy = (bitmap.height - side) / 2
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE)

    for (const quality of [0.85, 0.7, 0.5]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl
    }
    throw new ProfileImageError('사진 용량이 너무 커요. 다른 사진을 선택해주세요.')
  } finally {
    bitmap.close()
  }
}

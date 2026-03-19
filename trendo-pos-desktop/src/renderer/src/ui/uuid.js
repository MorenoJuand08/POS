// Lightweight UUID v4 generator (fallback) if you don't want to rely on 'uuid' package
export function uuidv4() {
  // Not RFC perfect but good enough for demo
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

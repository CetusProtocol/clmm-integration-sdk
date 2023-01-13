const HEX_REGEXP = /^[-+]?[0-9A-Fa-f]+\.?[0-9A-Fa-f]*?$/

export function removeHexPrefix(hex: string): string {
  return hex.startsWith('0x') ? `${hex.slice(2)}` : hex
}

export function checkAddress(address: any, options: { leadingZero: boolean } = { leadingZero: true }): boolean {
    if (typeof address !== 'string') {
      return false
    }
    let str = address
  
    if (options.leadingZero) {
      if (!address.startsWith('0x')) {
        return false
      }
      str = str.substring(2)
    }
  
    return HEX_REGEXP.test(str)
  }


export function hexToString(str: string) {
  let val = ''
  const newStr = removeHexPrefix(str)

  const len = newStr.length / 2
  for (let i = 0; i < len; i++) {
    val += String.fromCharCode(parseInt(newStr.substr(i * 2, 2), 16))
  }
  return utf8to16(val)
}
export function utf8to16(str: string) {
  let out
  let i
  let len
  let c
  let char2
  let char3
  out = ''
  len = str.length
  i = 0
  while (i < len) {
    c = str.charCodeAt(i++)
    switch (c >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        out += str.charAt(i - 1)
        break
      case 12:
      case 13:
        char2 = str.charCodeAt(i++)
        out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f))
        break
      case 14:
        char2 = str.charCodeAt(i++)
        char3 = str.charCodeAt(i++)
        out += String.fromCharCode(((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0))
        break
    }
  }
  return out
}

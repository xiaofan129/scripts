import {ofetch} from "ofetch"
import { Buffer } from "node:buffer"
import {
  createWriteStream,
  writeJSON,
  readJSON,
  exists,
  ensureDir,
} from 'fs-extra'
import { r } from "../alias"

/** 
  format：指定返回数据的格式，可以是xml，js，或者rss。
  idx：指定从今天开始往前推的天数，例如idx=0表示今天，idx=1表示昨天，最大值为7。
  n：指定返回图片的数量，最大值为82。
  pid：指定图片的来源，可以是hp（Bing首页），或者quiz（Bing问答）。
  FORM：指定表单的类型，可以是BEHPTB（Bing首页），或者其他值。
  uhd：指定是否返回超高清图片，可以是1（是），或者0（否）。
  uhdwidth：指定超高清图片的宽度，单位为像素。
  uhdheight：指定超高清图片的高度，单位为像素。
  setmkt：指定市场区域，例如en-US表示美国英语，或者留空表示自动检测。
  setlang：指定语言，例如en表示英语，或者留空表示自动检测。
 */
  const BING_API_TEMPLATE =
  'https://global.bing.com/HPImageArchive.aspx?format=js&idx=0&n=9&pid=hp&FORM=BEHPTB&uhd=1&uhdwidth=1920&uhdheight=1080&setmkt=%s&setlang=en'

const BING_URL = 'https://cn.bing.com'
const Regions = ['en-us', 'zh-cn']


async function main() {
  Regions.forEach(async region => {
    const apiUrl = BING_API_TEMPLATE.replace('%s', region)
    const resp = await ofetch(apiUrl)
    const { url, title, copyright, enddate } = resp.images[0]

    const meta = {
      url: BING_URL + url, // 1080p
      title,
      copyright,
      local: `bing/${region}/${enddate}.jpg`, // save path
    }

    const blob = await ofetch(meta.url, { responseType: 'blob' })
    const buffer = Buffer.from(await blob.arrayBuffer())
    await ensureDir(r(`bing/${region}`))
    const ws = createWriteStream(r(meta.local))
    ws.write(buffer)

    const saveTo = r(`bing/${region}.json`)
    if (await exists(saveTo)) {
      const json = await readJSON(saveTo)
      json[enddate] = meta
      writeJSON(saveTo, json, { spaces: 2 })
    } else {
      writeJSON(saveTo, { [enddate]: meta }, { spaces: 2 })
    }
  })
}

main()

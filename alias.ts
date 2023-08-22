import path from "node:path"

export const Root = path.resolve(__dirname)

export function r(...paths: string[]) {
  return path.resolve(Root, ...paths).replace(/\\/g, "/")
}
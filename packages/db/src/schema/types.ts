import { customType } from 'drizzle-orm/pg-core'

export const vector = (name: string, dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`
    },
    toDriver(value) {
      return `[${value.join(',')}]`
    },
    fromDriver(value) {
      const s = value as string
      return s.slice(1, -1).split(',').map(Number)
    },
  })(name)

export const tsvectorType = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

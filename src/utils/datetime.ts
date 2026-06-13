import dayjs from 'dayjs'

const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

export function formatDateTime(value?: string | null, emptyText = '-'): string {
  if (!value) {
    return emptyText
  }

  const parsed = dayjs(value)
  if (!parsed.isValid()) {
    return emptyText
  }

  return parsed.format(DATETIME_FORMAT)
}

export { DATETIME_FORMAT }

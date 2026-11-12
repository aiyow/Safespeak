export const concernStatuses = ['submitted','under_review','assigned','in_progress','resolved','closed','rejected']
export const statusText = value => value?.replaceAll('_',' ').replace(/^./, character => character.toUpperCase())

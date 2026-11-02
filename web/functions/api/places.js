import handler from '../../api/places.js'
import { runVercel } from '../_vercel.js'

export const onRequest = runVercel(handler)

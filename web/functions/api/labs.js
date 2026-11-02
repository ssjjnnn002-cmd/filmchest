import handler from '../../api/labs.js'
import { runVercel } from '../_vercel.js'

export const onRequest = runVercel(handler)

import * as http from 'node:http'
import { parse_req_url } from '../platform/req.mjs'
import { exchange } from '../platform/cognito.mjs'
import { Duration } from '../platform/duration.mjs'

export async function auth_callback_get(
  /** @type {http.IncomingMessage} */ req,
  /** @type {http.ServerResponse} */ res,
) {
  const { searchParams } = parse_req_url(req)
  const code = searchParams.get('code')
  const resp = await exchange(code)

  const state = searchParams.get('state')
  resp.state = null
  if (state) resp.state = JSON.parse(state)
  
  const [,payload_enc,] = resp.id_token.split('.')
  const payload = JSON.parse(atob(payload_enc))

  res.setHeader('Set-Cookie', [
    `auth_refresh_token=${resp.refresh_token}; SameSite=Strict; Path=/auth; HttpOnly; Expires=${new Date(payload.auth_time * 1000 + Duration.day * 30).toUTCString()}`,
    `auth_access_token=${resp.access_token}; SameSite=Strict; Path=/; Expires=${new Date(payload.exp * 1000).toUTCString()}`,
    `auth_user_email=${payload.email}; SameSite=Strict; Path=/; Expires=${new Date(payload.exp * 1000).toUTCString()}`,
  ])

  res.setHeader('Location', '/')
  res.statusCode = 307
  res.end()
}
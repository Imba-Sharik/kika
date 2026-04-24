import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { STRAPI_API_URL } from '@/shared/api/strapi'
import type { PostAuthLocalMutationResponse } from '@/shared/api/generated/types/PostAuthLocal'
import type { GetUsersMeQueryResponse } from '@/shared/api/generated/types/GetUsersMe'

// Strapi не включает role в OpenAPI схему — расширяем тип вручную
type UserWithRole = GetUsersMeQueryResponse & { role?: { type?: string } }

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const res = await fetch(`${STRAPI_API_URL}/auth/local`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: credentials.identifier,
            password: credentials.password,
          }),
        })

        if (!res.ok) return null

        const data: PostAuthLocalMutationResponse = await res.json()
        if (!data.jwt || !data.user) return null

        // role не приходит в auth/local даже с populate — нужен отдельный запрос
        const meRes = await fetch(`${STRAPI_API_URL}/users/me?populate=role`, {
          headers: { Authorization: `Bearer ${data.jwt}` },
        })
        if (!meRes.ok) return null
        const me: UserWithRole = await meRes.json()

        return {
          id: String(data.user.id),
          name: data.user.username,
          email: data.user.email,
          strapiJwt: data.jwt,
          role: me.role?.type ?? 'authenticated',
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.strapiJwt = user.strapiJwt ?? ''
        token.id = user.id
        token.role = user.role ?? 'authenticated'
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.strapiJwt = token.strapiJwt as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})

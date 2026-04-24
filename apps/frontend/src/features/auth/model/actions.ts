"use server"

import { AuthError } from "next-auth"

import { signIn } from "@/auth"
import { STRAPI_API_URL } from "@/shared/api/strapi"

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      identifier: formData.get("identifier"),
      password: formData.get("password"),
      redirectTo: "/",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" }
    }
    throw error // re-throw NEXT_REDIRECT
  }
  return null
}

export async function registerAction(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const username = formData.get("username") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" }
  }

  const res = await fetch(`${STRAPI_API_URL}/auth/local/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  })

  if (!res.ok) {
    const data = await res.json()
    return { error: data.error?.message ?? "Registration failed" }
  }

  try {
    await signIn("credentials", { identifier: email, password, redirectTo: "/" })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Registration successful, but login failed" }
    }
    throw error // re-throw NEXT_REDIRECT
  }
  return null
}

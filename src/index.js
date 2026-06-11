import { handleWebhook } from "./routes/webhook"
import { handleDocumentRoutes } from "./routes/document.routes"
import { handleLegalRoutes } from "./routes/legal.routes"

function handleFacebookVerification(request, env, url) {
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === env.VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return new Response("Verification failed", { status: 403 })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    const documentResponse = await handleDocumentRoutes(request, env, url)
    if (documentResponse) return documentResponse

    const legalResponse = await handleLegalRoutes(request, url)
    if (legalResponse) return legalResponse

    if (request.method === "GET") {
      return handleFacebookVerification(request, env, url)
    }

    if (request.method === "POST") {
      return handleWebhook(request, env)
    }

    return new Response("Not Found", { status: 404 })
  }
}

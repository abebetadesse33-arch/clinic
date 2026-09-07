import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const smartConfig = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/v1/oauth2/authorize`,
    token_endpoint: `${baseUrl}/api/v1/oauth2/token`,
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "private_key_jwt"],
    registration_endpoint: `${baseUrl}/api/v1/oauth2/register`,
    scopes_supported: [
      "openid",
      "profile",
      "fhirUser",
      "launch",
      "launch/patient",
      "patient/*.read",
      "patient/*.write",
      "user/*.read",
      "user/*.write",
      "offline_access",
    ],
    response_types_supported: ["code"],
    management_endpoint: `${baseUrl}/api/v1/oauth2/manage`,
    introspection_endpoint: `${baseUrl}/api/v1/oauth2/introspect`,
    revocation_endpoint: `${baseUrl}/api/v1/oauth2/revoke`,
    capabilities: [
      "launch-ehr",
      "launch-standalone",
      "client-public",
      "client-confidential-symmetric",
      "sso-openid-connect",
      "context-ehr-patient",
      "context-ehr-encounter",
      "permission-patient",
      "permission-user",
    ],
  };

  return NextResponse.json(smartConfig, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

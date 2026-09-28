/**
 * WebAuthn Helper for Device Biometrics (Fingerprint / Face ID / Phone PIN)
 */

export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) {
    console.warn("Biometrics check error:", e);
    return false;
  }
}

export async function registerBiometrics(teacherId: string, teacherName: string): Promise<string | null> {
  const available = await isBiometricsAvailable();
  if (!available) {
    throw new Error("Tu dispositivo no tiene soporte de biometría o bloqueo biométrico activo.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  // User ID as bytes
  const userIdBuffer = new TextEncoder().encode(`teacher_${teacherId}`);

  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Asistencia Bilingüe",
          id: window.location.hostname
        },
        user: {
          id: userIdBuffer,
          name: teacherName.toLowerCase().replace(/\s+/g, "."),
          displayName: teacherName
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },  // ES256
          { alg: -257, type: "public-key" } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Built-in Touch ID, Face ID, Android fingerprint
          userVerification: "preferred",
          residentKey: "preferred"
        },
        timeout: 60000,
        attestation: "none"
      }
    })) as PublicKeyCredential | null;

    if (!credential) return null;

    return credential.id;
  } catch (err: any) {
    console.error("Error registering biometrics:", err);
    throw err;
  }
}

export async function verifyBiometrics(credentialId?: string | null): Promise<boolean> {
  const available = await isBiometricsAvailable();
  if (!available) return false;

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  try {
    let allowCredentials: PublicKeyCredentialDescriptor[] | undefined = undefined;

    if (credentialId) {
      try {
        // Base64Url decode
        const base64 = credentialId.replace(/-/g, "+").replace(/_/g, "/");
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        allowCredentials = [
          {
            type: "public-key",
            id: bytes,
            transports: ["internal"]
          }
        ];
      } catch (decodeErr) {
        console.warn("Could not decode credentialId, verifying with any platform credential:", decodeErr);
      }
    }

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        userVerification: "required",
        timeout: 60000
      }
    });

    return !!assertion;
  } catch (err: any) {
    console.warn("Biometric verification cancelled or failed:", err);
    return false;
  }
}

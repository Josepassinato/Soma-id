
import { supabase } from './supabaseClient';

export const PasskeyService = {
  getDiagnostics: async () => {
    const isIframe = window.self !== window.top;
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    const hasWebAuthn = !!window.PublicKeyCredential;
    let platformAuthenticator = false;

    if (hasWebAuthn) {
      try {
        platformAuthenticator = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (e) {
        platformAuthenticator = false;
      }
    }

    return {
      isIframe,
      isSecure,
      hasWebAuthn,
      platformAuthenticator,
      origin: window.location.origin,
      userAgent: navigator.userAgent
    };
  },

  isSupported: async (): Promise<boolean> => {
    try {
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      if (!isSecure) return false;
      if (!window.PublicKeyCredential) return false;
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      console.warn("Falha ao verificar suporte biométrico SOMA-ID:", e);
      return false;
    }
  },

  register: async (userId: string, email: string) => {
    try {
      const challenge = window.crypto.getRandomValues(new Uint8Array(32));
      const options: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: { name: "SOMA-ID Solutions", id: window.location.hostname },
          user: {
            id: Uint8Array.from(userId, c => c.charCodeAt(0)),
            name: email,
            displayName: email,
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          timeout: 60000,
          attestation: "none",
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred"
          }
        }
      };

      const credential = await navigator.credentials.create(options) as any;
      if (credential) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            biometric_id: credential.id,
            raw_auth_data: JSON.stringify({ rawId: credential.id }) 
          })
          .eq('id', userId);

        if (error) throw error;
        return { success: true };
      }
      return { success: false, error: "Credencial SOMA-ID não gerada." };
    } catch (e: any) {
      if (e.name === 'SecurityError' || e.message?.includes('origin') || e.message?.includes('ancestors')) {
        return { success: false, error: "RESTRIÇÃO DE SEGURANÇA: Iframe bloqueia biometria." };
      }
      return { success: false, error: e.message || "Erro no registro SOMA-ID." };
    }
  },

  login: async () => {
    try {
      const challenge = window.crypto.getRandomValues(new Uint8Array(32));
      const options: CredentialRequestOptions = {
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
        }
      };
      const assertion = await navigator.credentials.get(options) as any;
      if (assertion) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('biometric_id', assertion.id)
          .single();
        if (error || !data) throw new Error("SOMA-ID não reconhecido.");
        return { success: true, email: data.email, userId: data.id };
      }
      return { success: false, error: "Falha na leitura SOMA-ID." };
    } catch (e: any) {
      if (e.name === 'SecurityError' || e.message?.includes('origin') || e.message?.includes('ancestors')) {
        return { success: false, error: "ACESSO NEGADO: Ambiente restrito." };
      }
      return { success: false, error: e.message || "Erro na autenticação SOMA-ID." };
    }
  }
};

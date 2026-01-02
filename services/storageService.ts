
import { supabase } from './supabaseClient';

export const StorageService = {
  /**
   * Converte uma string Base64 (DataURL) para URL pública do Supabase Storage.
   * Se o Supabase não estiver disponível, retorna a string original (Fallback).
   */
  uploadBase64Image: async (base64Data: string, folder: string = 'projects'): Promise<string> => {
    if (!supabase || !base64Data.startsWith('data:')) {
        return base64Data; // Retorna original se não for base64 ou sem supabase
    }

    try {
      // 1. Extrair Metadados do Base64
      const parts = base64Data.split(';');
      const mimeType = parts[0].split(':')[1];
      const base64Content = parts[1].split(',')[1];
      
      // 2. Converter para Blob
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // 3. Gerar Nome Único
      const ext = mimeType.split('/')[1];
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;

      // 4. Upload para 'user-content' (Deve ser criado no Supabase)
      const { data, error } = await supabase.storage
        .from('user-content')
        .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: false
        });

      if (error) throw error;

      // 5. Obter URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('user-content')
        .getPublicUrl(fileName);

      return publicUrl;

    } catch (e) {
      console.error('Falha no upload para Storage:', e);
      return base64Data; // Fallback: Salva o base64 no banco mesmo (dirty but working)
    }
  }
};

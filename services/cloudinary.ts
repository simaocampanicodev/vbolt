// services/cloudinary.ts
import { auth } from './firebase';

// ✅ Configuração do Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dlo35elbt';
const CLOUDINARY_UPLOAD_PRESET = 'avatars_preset';

/**
 * Faz upload de uma imagem para o Cloudinary
 * @param file - Arquivo de imagem a ser enviado
 * @returns URL pública da imagem
 */
export const uploadToCloudinary = async (file: File): Promise<string> => {
  try {
    console.log('📤 Fazendo upload para Cloudinary...');
    
    // Validações
    if (!file.type.startsWith('image/')) {
      throw new Error('Apenas imagens são permitidas');
    }
    
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Imagem muito grande! Máximo 5MB');
    }
    
    // Preparar FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    // Adicionar ID único do usuário como nome do arquivo
    // O Cloudinary automaticamente sobrescreve arquivos com o mesmo public_id
    const user = auth.currentUser;
    if (user) {
      formData.append('public_id', `avatars/${user.uid}`);
    }
    
    // Fazer upload
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erro do Cloudinary:', errorData);
      throw new Error(errorData.error?.message || 'Erro ao fazer upload');
    }
    
    const data = await response.json();
    console.log('✅ Upload concluído! URL:', data.secure_url);
    
    // ✅ CORREÇÃO: Adicionar timestamp para forçar atualização do cache do navegador
    // Quando o avatar é atualizado, o Cloudinary retorna a mesma URL, mas com cache
    // Adicionar ?t=timestamp força o navegador a buscar a nova versão
    const urlWithTimestamp = `${data.secure_url}?t=${Date.now()}`;
    
    // Retornar URL permanente e segura (HTTPS) com timestamp
    return urlWithTimestamp;
    
  } catch (error: any) {
    console.error('❌ Erro no upload para Cloudinary:', error);
    throw new Error(error.message || 'Erro ao fazer upload da imagem');
  }
};

/**
 * Remove o avatar atual do usuário
 * @returns URL com timestamp para forçar reload
 */
export const removeAvatar = async (): Promise<void> => {
  try {
    console.log('🗑️ Removendo avatar...');
    
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    
    // O Cloudinary não permite deletar via unsigned upload
    // Então vamos fazer upload de uma imagem transparente 1x1 pixel
    // Isso efetivamente "remove" o avatar visualmente
    
    // Criar imagem transparente 1x1 pixel
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 1, 1);
    }
    
    // Converter canvas para blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/png');
    });
    
    // Fazer upload da imagem transparente
    const formData = new FormData();
    formData.append('file', blob, 'transparent.png');
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('public_id', `avatars/${user.uid}`);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    if (!response.ok) {
      throw new Error('Erro ao remover avatar');
    }
    
    console.log('✅ Avatar removido com sucesso!');
    
  } catch (error: any) {
    console.error('❌ Erro ao remover avatar:', error);
    throw new Error(error.message || 'Erro ao remover avatar');
  }
};

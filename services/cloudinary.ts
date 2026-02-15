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
    const user = auth.currentUser;
    if (user) {
      formData.append('public_id', `avatars/${user.uid}`);
      formData.append('overwrite', 'true'); // Sobrescrever avatar anterior
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
    
    // Retornar URL permanente e segura (HTTPS)
    return data.secure_url;
    
  } catch (error: any) {
    console.error('❌ Erro no upload para Cloudinary:', error);
    throw new Error(error.message || 'Erro ao fazer upload da imagem');
  }
};

/**
 * Deleta uma imagem do Cloudinary (opcional)
 * Nota: Requer configuração adicional de API Key e Secret
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  // Implementar se necessário no futuro
  console.log('🗑️ Delete não implementado ainda');
};
